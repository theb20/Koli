package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"merchantgo/internal/config"
	"merchantgo/internal/geniuspay"
	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/utils"
)

type SettlementService interface {
	// GenerateForPeriod calcule et enregistre (idempotent par marchand+mois)
	// le relevé de chaque marchand ayant eu au moins une transaction wallet
	// sur [periodStart, periodEnd[, puis tente le versement automatique
	// Mobile Money de chacun (voir attemptPayout — jamais bloquant : un
	// marchand sans méthode configurée ou un relevé négatif reste
	// "informatif" comme avant). Renvoie TOUS les relevés de la période
	// (nouveaux ET déjà existants) pour que l'appelant (cron mensuel côté
	// backend/) sache lesquels notifier, et avec quel contenu d'email
	// (payé vs informatif), sans devoir les relister ensuite.
	GenerateForPeriod(ctx context.Context, periodStart, periodEnd time.Time) ([]models.MonthlySettlement, error)
	MarkSent(ctx context.Context, id uuid.UUID) error
	ListMine(ctx context.Context, userID string, page, limit int) ([]models.MonthlySettlement, int64, error)
	// GetByID — sert la génération de la fiche PDF côté backend/ (voir
	// seller.ts /settlements/:id/fiche) : backend/ vérifie lui-même que
	// user_id correspond bien au marchand authentifié avant de servir le
	// PDF, merchantgo ne connaît ici que la clé de service appelante.
	GetByID(ctx context.Context, id uuid.UUID) (*models.MonthlySettlement, error)
	// AdminRetryPayout — dérogation manuelle pour un relevé au statut
	// "failed" (voir doctrine dans models.MonthlySettlement : jamais
	// retenté automatiquement). Un admin doit d'abord avoir vérifié
	// manuellement auprès de GeniusPay que le cashout précédent n'est
	// effectivement jamais parti, sous peine de double paiement.
	AdminRetryPayout(ctx context.Context, id uuid.UUID) (*models.MonthlySettlement, error)
}

type settlementService struct {
	repo             repository.SettlementRepository
	payoutMethodRepo repository.PayoutMethodRepository
	cfg              *config.Config
	logger           *zap.Logger
}

func NewSettlementService(repo repository.SettlementRepository, payoutMethodRepo repository.PayoutMethodRepository, cfg *config.Config, logger *zap.Logger) SettlementService {
	return &settlementService{repo: repo, payoutMethodRepo: payoutMethodRepo, cfg: cfg, logger: logger}
}

func (s *settlementService) geniusPayClient() (*geniuspay.Client, error) {
	if !s.cfg.GeniusPayConfigured() {
		return nil, utils.NewAppError(503, "Paiement en ligne indisponible (GeniusPay non configuré)", nil)
	}
	apiKey, apiSecret := s.cfg.GeniusPayCredentials()
	return geniuspay.NewClient(geniuspay.Credentials{APIKey: apiKey, APISecret: apiSecret, BaseURL: s.cfg.GeniusPayBaseURL}), nil
}

func (s *settlementService) GenerateForPeriod(ctx context.Context, periodStart, periodEnd time.Time) ([]models.MonthlySettlement, error) {
	totals, err := s.repo.AggregateByUser(ctx, periodStart, periodEnd)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}

	results := make([]models.MonthlySettlement, 0, len(totals))
	for _, t := range totals {
		existing, err := s.repo.FindByUserAndPeriod(ctx, t.UserID, periodStart)
		if err != nil {
			return nil, utils.ErrInternal(err)
		}

		var settlement *models.MonthlySettlement
		if existing != nil {
			settlement = existing
		} else {
			settlement = &models.MonthlySettlement{
				UserID:             t.UserID,
				PeriodStart:        periodStart,
				PeriodEnd:          periodEnd,
				GrossAmount:        t.GrossAmount,
				CommissionAmount:   t.CommissionAmount,
				NetAmount:          t.NetAmount,
				TransactionCount:   t.TransactionCount,
				GeniusPayFeeAmount: t.GeniusPayFeeAmount,
				Status:             models.SettlementFinalized,
				PayoutStatus:       models.PayoutNone,
			}
			if err := s.repo.Create(ctx, settlement); err != nil {
				// Un marchand en échec ne doit jamais bloquer la génération des
				// autres — loggé, l'appelant peut relancer (idempotent, celui-ci
				// manquant sera recréé, les autres déjà créés seront ignorés).
				s.logger.Error("échec création relevé mensuel", zap.String("user_id", t.UserID), zap.Error(err))
				continue
			}
		}

		s.attemptPayout(ctx, settlement)
		results = append(results, *settlement)
	}
	return results, nil
}

// attemptPayout tente un versement Mobile Money automatique du net du
// relevé — ne renvoie jamais d'erreur à l'appelant (GenerateForPeriod doit
// continuer pour les autres marchands quoi qu'il arrive), modifie
// `settlement` en place et persiste le résultat.
func (s *settlementService) attemptPayout(ctx context.Context, settlement *models.MonthlySettlement) {
	// Statuts terminaux — jamais retentés (voir doctrine dans le modèle).
	if settlement.PayoutStatus == models.PayoutRequested || settlement.PayoutStatus == models.PayoutFailed {
		return
	}

	if settlement.NetAmount <= 0 {
		s.markPayoutSkip(ctx, settlement, models.PayoutSkippedNonPositive)
		return
	}

	method, err := s.payoutMethodRepo.FindByUserID(ctx, settlement.UserID)
	if err != nil {
		s.logger.Error("lecture méthode de versement échouée", zap.String("user_id", settlement.UserID), zap.Error(err))
		return // pas un échec du relevé lui-même — on retentera au prochain cycle
	}
	if method == nil {
		s.markPayoutSkip(ctx, settlement, models.PayoutSkippedNoMethod)
		return
	}

	client, err := s.geniusPayClient()
	if err != nil {
		s.logger.Warn("versement automatique suspendu — GeniusPay non configuré")
		return
	}

	result, err := client.RequestCashout(ctx, geniuspay.CashoutInput{
		Amount:    settlement.NetAmount,
		Phone:     method.Phone,
		Method:    method.Operator,
		Reference: settlement.ID.String(),
	})
	now := time.Now()
	if err != nil {
		s.logger.Error("versement automatique échoué — vérification manuelle requise", zap.String("settlement_id", settlement.ID.String()), zap.String("user_id", settlement.UserID), zap.Error(err))
		settlement.PayoutStatus = models.PayoutFailed
		settlement.PaidOutAt = nil
	} else {
		s.logger.Info("versement automatique déclenché", zap.String("settlement_id", settlement.ID.String()), zap.String("user_id", settlement.UserID), zap.String("reference", result.Reference))
		settlement.PayoutStatus = models.PayoutRequested
		settlement.PayoutReference = result.Reference
		settlement.PaidOutAt = &now
	}
	settlement.PayoutOperator = method.Operator
	settlement.PayoutPhone = method.Phone
	if err := s.repo.Update(ctx, settlement); err != nil {
		s.logger.Error("mise à jour relevé (versement) échouée", zap.String("settlement_id", settlement.ID.String()), zap.Error(err))
	}
}

func (s *settlementService) markPayoutSkip(ctx context.Context, settlement *models.MonthlySettlement, reason string) {
	if settlement.PayoutStatus == reason {
		return // déjà à jour, évite une écriture DB inutile à chaque cycle
	}
	settlement.PayoutStatus = reason
	if err := s.repo.Update(ctx, settlement); err != nil {
		s.logger.Error("mise à jour relevé (skip versement) échouée", zap.String("settlement_id", settlement.ID.String()), zap.Error(err))
	}
}

func (s *settlementService) GetByID(ctx context.Context, id uuid.UUID) (*models.MonthlySettlement, error) {
	settlement, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if settlement == nil {
		return nil, utils.ErrNotFound("Relevé introuvable")
	}
	return settlement, nil
}

func (s *settlementService) MarkSent(ctx context.Context, id uuid.UUID) error {
	return s.repo.MarkSent(ctx, id)
}

func (s *settlementService) ListMine(ctx context.Context, userID string, page, limit int) ([]models.MonthlySettlement, int64, error) {
	return s.repo.ListByUser(ctx, userID, page, limit)
}

func (s *settlementService) AdminRetryPayout(ctx context.Context, id uuid.UUID) (*models.MonthlySettlement, error) {
	settlement, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if settlement == nil {
		return nil, utils.ErrNotFound("Relevé introuvable")
	}
	if settlement.PayoutStatus != models.PayoutFailed {
		return nil, utils.ErrBadRequest(`Seul un relevé au statut "failed" peut être relancé manuellement`, nil)
	}
	settlement.PayoutStatus = models.PayoutNone
	s.attemptPayout(ctx, settlement)
	return settlement, nil
}
