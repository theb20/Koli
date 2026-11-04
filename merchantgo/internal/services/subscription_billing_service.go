package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"merchantgo/internal/backendapi"
	"merchantgo/internal/config"
	"merchantgo/internal/geniuspay"
	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/utils"
)

var monthLabelsFR = []string{
	"Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
	"Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
}

func monthLabel(t time.Time) string {
	return fmt.Sprintf("%s %d", monthLabelsFR[int(t.Month())-1], t.Year())
}

// SubscriptionBillingService recouvre les abonnements marchand de bout en
// bout, AUTOMATIQUEMENT par défaut (voir cmd/server/main.go, le ticker qui
// appelle RunCycle) : génération mensuelle, relance des liens de paiement
// expirés, suspension après délai de grâce, réactivation au paiement —
// aucune étape ne requiert d'action humaine. AdminMarkPaid est la seule
// porte de sortie manuelle (dérogation, voir handlers/subscription_invoice_handler.go).
type SubscriptionBillingService interface {
	RunCycle(ctx context.Context)
	// ConfirmPayment — appelé par le webhook GeniusPay quand la référence
	// correspond à une facture d'abonnement (pas une commande). Renvoie
	// (nil, nil) si la référence est inconnue ICI : l'appelant doit alors
	// essayer PaymentService (qui gère les commandes), jamais l'inverse.
	ConfirmPayment(ctx context.Context, providerRef string) (*models.SubscriptionInvoice, error)
	ListMine(ctx context.Context, userID string, page, limit int) ([]models.SubscriptionInvoice, int64, error)
	// AdminMarkPaid — dérogation manuelle (paiement reçu hors GeniusPay,
	// geste commercial...) : ne revérifie RIEN auprès de GeniusPay,
	// l'admin engage sa propre responsabilité en l'utilisant.
	AdminMarkPaid(ctx context.Context, id uuid.UUID) (*models.SubscriptionInvoice, error)
}

type subscriptionBillingService struct {
	repo        repository.SubscriptionInvoiceRepository
	billingRepo repository.BillingRepository
	cfg         *config.Config
	backend     *backendapi.Client
	logger      *zap.Logger
}

func NewSubscriptionBillingService(repo repository.SubscriptionInvoiceRepository, billingRepo repository.BillingRepository, cfg *config.Config, backend *backendapi.Client, logger *zap.Logger) SubscriptionBillingService {
	return &subscriptionBillingService{repo: repo, billingRepo: billingRepo, cfg: cfg, backend: backend, logger: logger}
}

func (s *subscriptionBillingService) geniusPayClient() (*geniuspay.Client, error) {
	if !s.cfg.GeniusPayConfigured() {
		return nil, utils.NewAppError(503, "Paiement en ligne indisponible (GeniusPay non configuré)", nil)
	}
	apiKey, apiSecret := s.cfg.GeniusPayCredentials()
	return geniuspay.NewClient(geniuspay.Credentials{APIKey: apiKey, APISecret: apiSecret, BaseURL: s.cfg.GeniusPayBaseURL}), nil
}

// RunCycle enchaîne les trois étapes automatiques — chacune isolée : un
// échec sur l'une (ex: GeniusPay indisponible) n'empêche jamais les autres
// de s'exécuter, et le prochain passage du ticker reprend là où il faut
// (tout est idempotent, voir les repository ci-dessous).
func (s *subscriptionBillingService) RunCycle(ctx context.Context) {
	if err := s.generateForCurrentPeriod(ctx); err != nil {
		s.logger.Error("génération factures abonnement échouée", zap.Error(err))
	}
	if err := s.relinkExpired(ctx); err != nil {
		s.logger.Error("relance liens abonnement expirés échouée", zap.Error(err))
	}
	if err := s.escalateOverdue(ctx); err != nil {
		s.logger.Error("escalade factures abonnement en retard échouée", zap.Error(err))
	}
}

func (s *subscriptionBillingService) returnURL() string {
	if s.cfg.MerchantFrontendURL == "" {
		return "https://me.skignas.com/facturation"
	}
	return s.cfg.MerchantFrontendURL + "/facturation"
}

func (s *subscriptionBillingService) generateForCurrentPeriod(ctx context.Context) error {
	now := time.Now().UTC()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	dueAt := periodStart.AddDate(0, 0, s.cfg.SubscriptionDueDays)

	billings, err := s.billingRepo.ListSubscriptionMode(ctx)
	if err != nil {
		return err
	}

	for _, b := range billings {
		if b.SubscriptionPlan == nil || b.SubscriptionPlan.PriceMonthly <= 0 {
			continue // plan gratuit ou mal lié — rien à facturer
		}

		existing, err := s.repo.FindByUserAndPeriod(ctx, b.UserID, periodStart)
		if err != nil {
			s.logger.Error("vérification facture existante échouée", zap.String("user_id", b.UserID), zap.Error(err))
			continue
		}
		if existing != nil {
			continue // déjà générée ce mois-ci — idempotent
		}

		client, err := s.geniusPayClient()
		if err != nil {
			s.logger.Warn("génération factures abonnement suspendue — GeniusPay non configuré")
			return nil // même cause pour tous les marchands, inutile de boucler
		}

		result, err := client.CreatePayment(ctx, geniuspay.CreatePaymentInput{
			Amount:      b.SubscriptionPlan.PriceMonthly,
			Description: fmt.Sprintf("Abonnement Skignas — %s", monthLabel(periodStart)),
			SuccessURL:  s.returnURL(),
			ErrorURL:    s.returnURL(),
			Metadata:    map[string]any{"user_id": b.UserID, "kind": "subscription_invoice"},
		})
		if err != nil {
			s.logger.Error("création paiement abonnement échouée", zap.String("user_id", b.UserID), zap.Error(err))
			continue
		}

		invoice := &models.SubscriptionInvoice{
			UserID:        b.UserID,
			PeriodStart:   periodStart,
			Amount:        b.SubscriptionPlan.PriceMonthly,
			Status:        models.InvoicePending,
			ProviderRef:   result.Reference,
			CheckoutURL:   result.CheckoutURL,
			LinkExpiresAt: parseExpiresAt(result.ExpiresAt),
			DueAt:         dueAt,
		}
		if err := s.repo.Create(ctx, invoice); err != nil {
			s.logger.Error("enregistrement facture abonnement échoué", zap.String("user_id", b.UserID), zap.Error(err))
			continue
		}

		if err := s.backend.SendSubscriptionInvoiceEmail(ctx, b.UserID, invoice.Amount, invoice.CheckoutURL, invoice.DueAt, periodStart); err != nil {
			s.logger.Error("notification facture abonnement échouée", zap.String("user_id", b.UserID), zap.Error(err))
		}
	}
	return nil
}

func (s *subscriptionBillingService) relinkExpired(ctx context.Context) error {
	client, err := s.geniusPayClient()
	if err != nil {
		return nil
	}
	expired, err := s.repo.ListExpiredLinksPending(ctx, time.Now().UTC())
	if err != nil {
		return err
	}

	for i := range expired {
		inv := expired[i]
		result, err := client.CreatePayment(ctx, geniuspay.CreatePaymentInput{
			Amount:      inv.Amount,
			Description: fmt.Sprintf("Abonnement Skignas — %s (relance)", monthLabel(inv.PeriodStart)),
			SuccessURL:  s.returnURL(),
			ErrorURL:    s.returnURL(),
			Metadata:    map[string]any{"user_id": inv.UserID, "kind": "subscription_invoice"},
		})
		if err != nil {
			s.logger.Error("relance lien abonnement échouée", zap.String("invoice_id", inv.ID.String()), zap.Error(err))
			continue
		}

		inv.ProviderRef = result.Reference
		inv.CheckoutURL = result.CheckoutURL
		inv.LinkExpiresAt = parseExpiresAt(result.ExpiresAt)
		if err := s.repo.Update(ctx, &inv); err != nil {
			s.logger.Error("mise à jour facture (relance) échouée", zap.String("invoice_id", inv.ID.String()), zap.Error(err))
			continue
		}
		if err := s.backend.SendSubscriptionInvoiceEmail(ctx, inv.UserID, inv.Amount, inv.CheckoutURL, inv.DueAt, inv.PeriodStart); err != nil {
			s.logger.Error("notification relance abonnement échouée", zap.String("user_id", inv.UserID), zap.Error(err))
		}
	}
	return nil
}

func (s *subscriptionBillingService) escalateOverdue(ctx context.Context) error {
	cutoff := time.Now().UTC().AddDate(0, 0, -s.cfg.SubscriptionGraceDays)
	overdue, err := s.repo.ListOverdueUnescalated(ctx, cutoff)
	if err != nil {
		return err
	}

	for i := range overdue {
		inv := overdue[i]
		reason := fmt.Sprintf("Facture d'abonnement de %s impayée %d jours après son échéance.", monthLabel(inv.PeriodStart), s.cfg.SubscriptionGraceDays)
		if err := s.backend.SuspendMerchant(ctx, inv.UserID, reason, inv.CheckoutURL); err != nil {
			s.logger.Error("suspension automatique échouée", zap.String("user_id", inv.UserID), zap.Error(err))
			continue // SuspendedAt reste nil — retenté au prochain cycle
		}
		now := time.Now()
		inv.SuspendedAt = &now
		inv.Status = models.InvoiceOverdue
		if err := s.repo.Update(ctx, &inv); err != nil {
			s.logger.Error("mise à jour facture (escalade) échouée", zap.String("invoice_id", inv.ID.String()), zap.Error(err))
		}
		s.logger.Info("marchand suspendu automatiquement (abonnement impayé)", zap.String("user_id", inv.UserID), zap.String("invoice_id", inv.ID.String()))
	}
	return nil
}

func (s *subscriptionBillingService) ConfirmPayment(ctx context.Context, providerRef string) (*models.SubscriptionInvoice, error) {
	inv, err := s.repo.FindByProviderRef(ctx, providerRef)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if inv == nil {
		return nil, nil // pas une facture d'abonnement — laisser l'appelant essayer PaymentService
	}
	if inv.Status == models.InvoicePaid {
		return inv, nil // idempotent — webhook rejoué
	}

	client, err := s.geniusPayClient()
	if err != nil {
		return nil, err
	}
	detail, err := client.CheckStatus(ctx, providerRef)
	if err != nil {
		return nil, utils.NewAppError(502, "Vérification du paiement abonnement échouée", err)
	}
	if detail.Status != "completed" {
		return inv, nil // revérifié, pas encore réellement payé
	}

	wasSuspended := inv.SuspendedAt != nil
	now := time.Now()
	inv.Status = models.InvoicePaid
	inv.PaidAt = &now
	if err := s.repo.Update(ctx, inv); err != nil {
		return nil, utils.ErrInternal(err)
	}

	if wasSuspended {
		if err := s.backend.UnsuspendMerchant(ctx, inv.UserID); err != nil {
			s.logger.Error("réactivation automatique échouée", zap.String("user_id", inv.UserID), zap.Error(err))
		}
	}
	return inv, nil
}

func (s *subscriptionBillingService) ListMine(ctx context.Context, userID string, page, limit int) ([]models.SubscriptionInvoice, int64, error) {
	return s.repo.ListByUser(ctx, userID, page, limit)
}

func (s *subscriptionBillingService) AdminMarkPaid(ctx context.Context, id uuid.UUID) (*models.SubscriptionInvoice, error) {
	inv, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if inv == nil {
		return nil, utils.ErrNotFound("Facture introuvable")
	}
	if inv.Status == models.InvoicePaid {
		return inv, nil
	}

	wasSuspended := inv.SuspendedAt != nil
	now := time.Now()
	inv.Status = models.InvoicePaid
	inv.PaidAt = &now
	if err := s.repo.Update(ctx, inv); err != nil {
		return nil, utils.ErrInternal(err)
	}

	if wasSuspended {
		if err := s.backend.UnsuspendMerchant(ctx, inv.UserID); err != nil {
			s.logger.Error("réactivation (dérogation admin) échouée", zap.String("user_id", inv.UserID), zap.Error(err))
		}
	}
	return inv, nil
}

func parseExpiresAt(raw string) *time.Time {
	if raw == "" {
		return nil
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return &t
	}
	return nil
}
