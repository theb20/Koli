package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"merchantgo/internal/models"
)

// SettlementPeriodTotal — un marchand, ses totaux agrégés sur une période.
type SettlementPeriodTotal struct {
	UserID             string
	GrossAmount        int
	CommissionAmount   int
	NetAmount          int
	TransactionCount   int
	GeniusPayFeeAmount int
}

type SettlementRepository interface {
	// AggregateByUser somme les WalletTransaction (ventes ET remboursements
	// confondus) par marchand sur [periodStart, periodEnd[ — un marchand
	// sans transaction sur la période n'apparaît simplement pas.
	AggregateByUser(ctx context.Context, periodStart, periodEnd time.Time) ([]SettlementPeriodTotal, error)
	// FindByUserAndPeriod sert l'idempotence de la génération — renvoie
	// (nil, nil) si aucun relevé n'existe encore pour ce couple.
	FindByUserAndPeriod(ctx context.Context, userID string, periodStart time.Time) (*models.MonthlySettlement, error)
	Create(ctx context.Context, s *models.MonthlySettlement) error
	Update(ctx context.Context, s *models.MonthlySettlement) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.MonthlySettlement, error)
	MarkSent(ctx context.Context, id uuid.UUID) error
	ListByUser(ctx context.Context, userID string, page, limit int) ([]models.MonthlySettlement, int64, error)
}

type gormSettlementRepository struct {
	db *gorm.DB
}

func NewSettlementRepository(db *gorm.DB) SettlementRepository {
	return &gormSettlementRepository{db: db}
}

func (r *gormSettlementRepository) AggregateByUser(ctx context.Context, periodStart, periodEnd time.Time) ([]SettlementPeriodTotal, error) {
	var totals []SettlementPeriodTotal
	err := r.db.WithContext(ctx).Model(&models.WalletTransaction{}).
		Select("user_id, COALESCE(SUM(gross_amount),0) as gross_amount, COALESCE(SUM(commission_amount),0) as commission_amount, COALESCE(SUM(net_amount),0) as net_amount, COUNT(*) as transaction_count, COALESCE(SUM(geniuspay_fee_amount),0) as geniuspay_fee_amount").
		Where("created_at >= ? AND created_at < ?", periodStart, periodEnd).
		Group("user_id").
		Scan(&totals).Error
	return totals, err
}

func (r *gormSettlementRepository) FindByUserAndPeriod(ctx context.Context, userID string, periodStart time.Time) (*models.MonthlySettlement, error) {
	var s models.MonthlySettlement
	err := r.db.WithContext(ctx).First(&s, "user_id = ? AND period_start = ?", userID, periodStart).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *gormSettlementRepository) Create(ctx context.Context, s *models.MonthlySettlement) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *gormSettlementRepository) Update(ctx context.Context, s *models.MonthlySettlement) error {
	return r.db.WithContext(ctx).Save(s).Error
}

func (r *gormSettlementRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.MonthlySettlement, error) {
	var s models.MonthlySettlement
	err := r.db.WithContext(ctx).First(&s, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *gormSettlementRepository) MarkSent(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&models.MonthlySettlement{}).Where("id = ?", id).
		Updates(map[string]any{"status": models.SettlementSent, "sent_at": now}).Error
}

func (r *gormSettlementRepository) ListByUser(ctx context.Context, userID string, page, limit int) ([]models.MonthlySettlement, int64, error) {
	var items []models.MonthlySettlement
	var total int64

	base := r.db.WithContext(ctx).Model(&models.MonthlySettlement{}).Where("user_id = ?", userID)
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("period_start desc").
		Offset((page - 1) * limit).Limit(limit).
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}
