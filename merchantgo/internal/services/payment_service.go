package services

import (
	"context"
	"fmt"

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

func (s *paymentService) CreatePayment(ctx context.Context, in CreatePaymentInput) (*models.PaymentIntent, error) {
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

	// Déjà traité (webhook rejoué, ou double appel) — pas de nouvel effet de
	// bord, on renvoie l'état déjà connu.
	if intent.State == models.PaymentSuccess {
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

	if intent.State != models.PaymentSuccess {
		return intent, nil
	}

	if !s.backend.Configured() {
		s.logger.Warn("backend non configuré — la commande n'a pas pu être marquée payée", zap.String("orderId", intent.OrderID))
		return intent, nil
	}
	if err := s.backend.MarkOrderPaid(ctx, intent.OrderID, intent.ProviderRef, detail.Operator); err != nil {
		// Le paiement est confirmé et l'intent l'enregistre déjà en base —
		// une erreur ici doit remonter en 5xx pour que WiniPayer retente le
		// webhook, ce qui redéclenchera ConfirmPayment jusqu'à ce que
		// backend/ réponde (voir kyc_webhook_handler.go, même doctrine).
		return nil, utils.NewAppError(502, "Confirmation de commande échouée côté backend", err)
	}

	return intent, nil
}
