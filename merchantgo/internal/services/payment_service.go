package services

import (
	"context"
	"fmt"
	"sync"

	"go.uber.org/zap"

	"merchantgo/internal/backendapi"
	"merchantgo/internal/config"
	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/utils"
	"merchantgo/internal/winipayer"
)

type CreatePaymentInput struct {
	OrderID     string
	OrderNumber string
	Amount      int
	Description string
	ReturnURL   string
	CancelURL   string
}

type PaymentService interface {
	CreatePayment(ctx context.Context, in CreatePaymentInput) (*models.PaymentIntent, error)
	// ConfirmPayment revérifie une transaction auprès de WiniPayer (jamais
	// via le seul contenu du webhook) et, si elle est effectivement payée,
	// notifie backend/ une seule fois (idempotent via l'état stocké).
	ConfirmPayment(ctx context.Context, providerRef string) (*models.PaymentIntent, error)
}

type paymentService struct {
	repo    repository.PaymentRepository
	cfg     *config.Config
	backend *backendapi.Client
	logger  *zap.Logger
	// Un verrou par commande : deux créations simultanées pour la même
	// commande (double-clic sur « Payer ») sont sérialisées, la seconde
	// retrouve alors l'intention créée par la première. Suffisant tant que
	// merchantgo tourne en une seule instance.
	orderLocks sync.Map // orderID → *sync.Mutex
}

func NewPaymentService(repo repository.PaymentRepository, cfg *config.Config, backend *backendapi.Client, logger *zap.Logger) PaymentService {
	return &paymentService{repo: repo, cfg: cfg, backend: backend, logger: logger}
}

func (s *paymentService) winipayerClient() (*winipayer.Client, error) {
	if !s.cfg.WinipayerConfigured() {
		return nil, utils.NewAppError(503, "Paiement en ligne indisponible (WiniPayer non configuré)", nil)
	}
	apply, token, key := s.cfg.WinipayerCredentials()
	return winipayer.NewClient(winipayer.Credentials{
		MerchantApply: apply,
		MerchantToken: token,
		PrivateKey:    key,
		Env:           s.cfg.WinipayerEnv,
	}), nil
}

// CreatePayment est idempotent par commande : tant qu'une tentative est
// encore en attente pour le même montant, son lien est renvoyé au lieu
// d'ouvrir une nouvelle transaction WiniPayer. Sans ça, un double envoi
// créait deux transactions et backend/ ne gardait que la référence de la
// dernière : un client payant avec le PREMIER lien voyait sa confirmation
// refusée (« référence incohérente »), commande jamais marquée payée.
// Une tentative échouée/annulée n'est pas réutilisée : le client peut relancer.
func (s *paymentService) CreatePayment(ctx context.Context, in CreatePaymentInput) (*models.PaymentIntent, error) {
	lock, _ := s.orderLocks.LoadOrStore(in.OrderID, &sync.Mutex{})
	lock.(*sync.Mutex).Lock()
	defer lock.(*sync.Mutex).Unlock()

	existing, err := s.repo.FindPendingByOrderID(ctx, in.OrderID)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if existing != nil && existing.Amount == in.Amount && existing.CheckoutURL != "" {
		s.logger.Info("paiement déjà initié pour cette commande, lien existant renvoyé",
			zap.String("orderId", in.OrderID), zap.String("providerRef", existing.ProviderRef))
		return existing, nil
	}

	client, err := s.winipayerClient()
	if err != nil {
		return nil, err
	}

	callbackURL := s.cfg.PublicURL + "/api/v1/webhooks/winipayer"
	result, err := client.CreatePayment(ctx, winipayer.CreatePaymentInput{
		Amount:      in.Amount,
		Description: in.Description,
		ReturnURL:   in.ReturnURL,
		CancelURL:   in.CancelURL,
		CallbackURL: callbackURL,
		CustomData:  map[string]any{"order_id": in.OrderID, "order_number": in.OrderNumber},
	})
	if err != nil {
		s.logger.Error("création paiement WiniPayer échouée", zap.Error(err), zap.String("orderId", in.OrderID))
		return nil, utils.NewAppError(502, "Création du paiement WiniPayer échouée", err)
	}

	intent := &models.PaymentIntent{
		Provider:    models.ProviderWinipayer,
		ProviderRef: result.UUID,
		OrderID:     in.OrderID,
		OrderNumber: in.OrderNumber,
		Amount:      in.Amount,
		State:       models.PaymentPending,
		CheckoutURL: result.CheckoutURL,
	}
	if err := s.repo.Create(ctx, intent); err != nil {
		return nil, utils.ErrInternal(fmt.Errorf("enregistrement intention de paiement: %w", err))
	}
	return intent, nil
}

func (s *paymentService) ConfirmPayment(ctx context.Context, providerRef string) (*models.PaymentIntent, error) {
	intent, err := s.repo.FindByProviderRef(ctx, providerRef)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if intent == nil {
		return nil, utils.ErrNotFound("Transaction inconnue")
	}

	// Déjà dans un état terminal (webhook rejoué, double appel, ou l'appel de
	// vérification en direct arrive après que le webhook a déjà tout réglé) —
	// pas de nouvel effet de bord, on renvoie l'état déjà connu. C'est ce qui
	// garantit qu'un webhook "cancelled" reçu 3 fois ne produit qu'une seule
	// annulation réelle côté backend.
	if intent.State == models.PaymentSuccess || intent.State == models.PaymentCancelled || intent.State == models.PaymentFailed {
		return intent, nil
	}

	client, err := s.winipayerClient()
	if err != nil {
		return nil, err
	}

	detail, err := client.CheckStatus(ctx, providerRef)
	if err != nil {
		s.logger.Error("vérification statut WiniPayer échouée", zap.Error(err), zap.String("providerRef", providerRef))
		return nil, utils.NewAppError(502, "Vérification du paiement WiniPayer échouée", err)
	}

	switch detail.State {
	case "success":
		intent.State = models.PaymentSuccess
	case "failed":
		intent.State = models.PaymentFailed
	case "cancelled":
		intent.State = models.PaymentCancelled
	default:
		intent.State = models.PaymentPending
	}
	intent.OperatorRef = detail.OperatorRef

	if err := s.repo.Update(ctx, intent); err != nil {
		return nil, utils.ErrInternal(fmt.Errorf("mise à jour intention de paiement: %w", err))
	}

	if !s.backend.Configured() {
		s.logger.Warn("backend non configuré — la commande n'a pas pu être notifiée", zap.String("orderId", intent.OrderID), zap.String("state", string(intent.State)))
		return intent, nil
	}

	switch intent.State {
	case models.PaymentSuccess:
		if err := s.backend.MarkOrderPaid(ctx, intent.OrderID, intent.ProviderRef, detail.Operator); err != nil {
			// Le paiement est confirmé et l'intent l'enregistre déjà en base —
			// une erreur ici doit remonter en 5xx pour que WiniPayer retente
			// le webhook, ce qui redéclenchera ConfirmPayment jusqu'à ce que
			// backend/ réponde (voir kyc_webhook_handler.go, même doctrine).
			return nil, utils.NewAppError(502, "Confirmation de commande échouée côté backend", err)
		}
	case models.PaymentCancelled, models.PaymentFailed:
		if err := s.backend.MarkOrderCancelled(ctx, intent.OrderID, intent.ProviderRef, string(intent.State)); err != nil {
			return nil, utils.NewAppError(502, "Annulation de commande échouée côté backend", err)
		}
	default:
		// pending — rien à notifier tant que WiniPayer n'a pas de statut terminal.
	}

	return intent, nil
}
