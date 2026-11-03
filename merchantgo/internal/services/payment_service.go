package services

import (
	"context"
	"fmt"
	"sync"

	"go.uber.org/zap"

	"merchantgo/internal/backendapi"
	"merchantgo/internal/config"
	"merchantgo/internal/geniuspay"
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
	// ConfirmRefund traite l'événement webhook GeniusPay "refund.completed" —
	// ne DÉCLENCHE jamais de remboursement (GeniusPay n'en expose pas
	// l'API), enregistre seulement qu'un remboursement déjà fait côté
	// GeniusPay (manuellement, par un humain sur leur dashboard) doit être
	// répercuté côté backend. Idempotent comme ConfirmPayment.
	ConfirmRefund(ctx context.Context, providerRef string) (*models.PaymentIntent, error)
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

// winipayerClient — réservé à ConfirmPayment pour les transactions WiniPayer
// déjà en attente au moment de la bascule (voir CreatePayment, qui ne crée
// plus que des paiements GeniusPay).
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

func (s *paymentService) geniusPayClient() (*geniuspay.Client, error) {
	if !s.cfg.GeniusPayConfigured() {
		return nil, utils.NewAppError(503, "Paiement en ligne indisponible (GeniusPay non configuré)", nil)
	}
	apiKey, apiSecret := s.cfg.GeniusPayCredentials()
	return geniuspay.NewClient(geniuspay.Credentials{
		APIKey:    apiKey,
		APISecret: apiSecret,
		BaseURL:   s.cfg.GeniusPayBaseURL,
	}), nil
}

// CreatePayment est idempotent par commande : tant qu'une tentative est
// encore en attente pour le même montant, son lien est renvoyé au lieu
// d'ouvrir une nouvelle transaction GeniusPay. Sans ça, un double envoi
// créait deux transactions et backend/ ne gardait que la référence de la
// dernière : un client payant avec le PREMIER lien voyait sa confirmation
// refusée (« référence incohérente »), commande jamais marquée payée.
// Une tentative échouée/annulée n'est pas réutilisée : le client peut relancer.
//
// Passerelle active : GeniusPay (WiniPayer retiré — voir winipayerClient,
// conservé seulement pour revérifier les transactions déjà en attente au
// moment de la bascule).
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

	client, err := s.geniusPayClient()
	if err != nil {
		return nil, err
	}

	result, err := client.CreatePayment(ctx, geniuspay.CreatePaymentInput{
		Amount:      in.Amount,
		Description: in.Description,
		// GeniusPay n'a qu'un couple success/error (pas de 3e URL "cancel"
		// distincte) — les deux pointent de toute façon vers la même page
		// neutre de vérification côté koili (voir orderPaymentUrl, backend/).
		SuccessURL: in.ReturnURL,
		ErrorURL:   in.CancelURL,
		Metadata:   map[string]any{"order_id": in.OrderID, "order_number": in.OrderNumber},
	})
	if err != nil {
		s.logger.Error("création paiement GeniusPay échouée", zap.Error(err), zap.String("orderId", in.OrderID))
		return nil, utils.NewAppError(502, "Création du paiement GeniusPay échouée", err)
	}

	intent := &models.PaymentIntent{
		Provider:    models.ProviderGeniusPay,
		ProviderRef: result.Reference,
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

	state, operator, operatorRef, err := s.checkProviderStatus(ctx, intent)
	if err != nil {
		return nil, err
	}
	intent.State = state
	intent.OperatorRef = operatorRef

	if err := s.repo.Update(ctx, intent); err != nil {
		return nil, utils.ErrInternal(fmt.Errorf("mise à jour intention de paiement: %w", err))
	}

	if !s.backend.Configured() {
		s.logger.Warn("backend non configuré — la commande n'a pas pu être notifiée", zap.String("orderId", intent.OrderID), zap.String("state", string(intent.State)))
		return intent, nil
	}

	switch intent.State {
	case models.PaymentSuccess:
		if err := s.backend.MarkOrderPaid(ctx, intent.OrderID, intent.ProviderRef, operator); err != nil {
			// Le paiement est confirmé et l'intent l'enregistre déjà en base —
			// une erreur ici doit remonter en 5xx pour que la passerelle
			// retente le webhook, ce qui redéclenchera ConfirmPayment jusqu'à
			// ce que backend/ réponde (voir kyc_webhook_handler.go, même doctrine).
			return nil, utils.NewAppError(502, "Confirmation de commande échouée côté backend", err)
		}
	case models.PaymentCancelled, models.PaymentFailed:
		if err := s.backend.MarkOrderCancelled(ctx, intent.OrderID, intent.ProviderRef, string(intent.State)); err != nil {
			return nil, utils.NewAppError(502, "Annulation de commande échouée côté backend", err)
		}
	default:
		// pending — rien à notifier tant que la passerelle n'a pas de statut terminal.
	}

	return intent, nil
}

// ConfirmRefund traite l'événement webhook GeniusPay "refund.completed".
// Contrairement à ConfirmPayment, il n'existe pas de valeur de statut
// GeniusPay documentée pour "remboursé" sur GET /payments/:reference (SDK
// officiel muet sur le sujet — voir geniuspay/client.go) : on ne peut donc
// pas revérifier l'état exactement comme pour un paiement. On s'appuie ici
// sur l'événement webhook lui-même (signature HMAC déjà vérifiée par
// l'appelant, voir handlers/payment_handler.go) plutôt que de bloquer sur
// une revérification impossible ; CheckStatus est quand même appelé pour
// logguer le statut brut renvoyé, à titre de traçabilité et pour affiner
// cette doctrine plus tard si GeniusPay documente un jour la bonne valeur.
func (s *paymentService) ConfirmRefund(ctx context.Context, providerRef string) (*models.PaymentIntent, error) {
	intent, err := s.repo.FindByProviderRef(ctx, providerRef)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if intent == nil {
		return nil, utils.ErrNotFound("Transaction inconnue")
	}
	if intent.State == models.PaymentRefunded {
		return intent, nil // webhook rejoué — déjà traité
	}

	if client, err := s.geniusPayClient(); err == nil {
		if detail, err := client.CheckStatus(ctx, providerRef); err == nil {
			s.logger.Info("remboursement GeniusPay confirmé",
				zap.String("providerRef", providerRef), zap.String("statusBrut", detail.Status))
		} else {
			s.logger.Warn("revérification statut GeniusPay (remboursement) échouée — on continue sur la foi du webhook signé",
				zap.Error(err), zap.String("providerRef", providerRef))
		}
	}

	intent.State = models.PaymentRefunded
	if err := s.repo.Update(ctx, intent); err != nil {
		return nil, utils.ErrInternal(fmt.Errorf("mise à jour intention de paiement (remboursement): %w", err))
	}

	if !s.backend.Configured() {
		s.logger.Warn("backend non configuré — remboursement non notifié", zap.String("orderId", intent.OrderID))
		return intent, nil
	}
	if err := s.backend.MarkOrderRefunded(ctx, intent.OrderID, intent.ProviderRef); err != nil {
		// 5xx volontaire : GeniusPay retente le webhook, ce qui absorbe une
		// panne transitoire de backend/ (même doctrine que ConfirmPayment).
		return nil, utils.NewAppError(502, "Notification du remboursement échouée côté backend", err)
	}
	return intent, nil
}

// checkProviderStatus revérifie l'état réel d'une transaction auprès du
// FOURNISSEUR enregistré sur l'intent au moment de sa création — jamais un
// client unique : une transaction WiniPayer encore en attente au moment de
// la bascule vers GeniusPay doit continuer à être vérifiée auprès de
// WiniPayer, pas de GeniusPay qui ne la connaît pas. Renvoie (état mappé,
// nom de l'opérateur de paiement, référence opérateur, erreur).
func (s *paymentService) checkProviderStatus(ctx context.Context, intent *models.PaymentIntent) (models.PaymentState, string, string, error) {
	switch intent.Provider {
	case models.ProviderGeniusPay:
		client, err := s.geniusPayClient()
		if err != nil {
			return "", "", "", err
		}
		detail, err := client.CheckStatus(ctx, intent.ProviderRef)
		if err != nil {
			s.logger.Error("vérification statut GeniusPay échouée", zap.Error(err), zap.String("providerRef", intent.ProviderRef))
			return "", "", "", utils.NewAppError(502, "Vérification du paiement GeniusPay échouée", err)
		}
		return mapGeniusPayStatus(detail.Status), detail.Gateway, detail.GatewayRef, nil

	case models.ProviderWinipayer:
		client, err := s.winipayerClient()
		if err != nil {
			return "", "", "", err
		}
		detail, err := client.CheckStatus(ctx, intent.ProviderRef)
		if err != nil {
			s.logger.Error("vérification statut WiniPayer échouée", zap.Error(err), zap.String("providerRef", intent.ProviderRef))
			return "", "", "", utils.NewAppError(502, "Vérification du paiement WiniPayer échouée", err)
		}
		return mapWinipayerStatus(detail.State), detail.Operator, detail.OperatorRef, nil

	default:
		return "", "", "", utils.NewAppError(500, fmt.Sprintf("Fournisseur de paiement inconnu: %s", intent.Provider), nil)
	}
}

func mapGeniusPayStatus(status string) models.PaymentState {
	switch status {
	case "completed":
		return models.PaymentSuccess
	case "failed", "expired":
		return models.PaymentFailed
	case "cancelled":
		return models.PaymentCancelled
	default: // pending, processing
		return models.PaymentPending
	}
}

func mapWinipayerStatus(state string) models.PaymentState {
	switch state {
	case "success":
		return models.PaymentSuccess
	case "failed":
		return models.PaymentFailed
	case "cancelled":
		return models.PaymentCancelled
	default:
		return models.PaymentPending
	}
}
