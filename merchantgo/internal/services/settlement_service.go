package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/utils"
)

type SettlementService interface {
	// GenerateForPeriod calcule et enregistre (idempotent par marchand+mois)
	// le relevé de chaque marchand ayant eu au moins une transaction wallet
	// sur [periodStart, periodEnd[. Renvoie TOUS les relevés de la période
	// (nouveaux ET déjà existants) pour que l'appelant (cron mensuel côté
	// backend/) sache lesquels notifier sans devoir les relister ensuite.
	GenerateForPeriod(ctx context.Context, periodStart, periodEnd time.Time) ([]models.MonthlySettlement, error)
	MarkSent(ctx context.Context, id uuid.UUID) error
	ListMine(ctx context.Context, userID string, page, limit int) ([]models.MonthlySettlement, int64, error)
}

type settlementService struct {
	repo   repository.SettlementRepository
	logger *zap.Logger
}

func NewSettlementService(repo repository.SettlementRepository, logger *zap.Logger) SettlementService {
	return &settlementService{repo: repo, logger: logger}
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
		if existing != nil {
			results = append(results, *existing)
			continue
		}

		settlement := &models.MonthlySettlement{
			UserID:           t.UserID,
			PeriodStart:      periodStart,
			PeriodEnd:        periodEnd,
			GrossAmount:      t.GrossAmount,
			CommissionAmount: t.CommissionAmount,
			NetAmount:        t.NetAmount,
			TransactionCount: t.TransactionCount,
			Status:           models.SettlementFinalized,
		}
		if err := s.repo.Create(ctx, settlement); err != nil {
			// Un marchand en échec ne doit jamais bloquer la génération des
			// autres — loggé, l'appelant peut relancer (idempotent, celui-ci
			// manquant sera recréé, les autres déjà créés seront ignorés).
			s.logger.Error("échec création relevé mensuel", zap.String("user_id", t.UserID), zap.Error(err))
			continue
		}
		results = append(results, *settlement)
	}
	return results, nil
}

func (s *settlementService) MarkSent(ctx context.Context, id uuid.UUID) error {
	return s.repo.MarkSent(ctx, id)
}

func (s *settlementService) ListMine(ctx context.Context, userID string, page, limit int) ([]models.MonthlySettlement, int64, error) {
	return s.repo.ListByUser(ctx, userID, page, limit)
}
