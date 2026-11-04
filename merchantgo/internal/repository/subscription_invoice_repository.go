package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"merchantgo/internal/models"
)

type SubscriptionInvoiceRepository interface {
	Create(ctx context.Context, i *models.SubscriptionInvoice) error
	// FindByUserAndPeriod sert l'idempotence de la génération mensuelle.
	FindByUserAndPeriod(ctx context.Context, userID string, periodStart time.Time) (*models.SubscriptionInvoice, error)
	FindByProviderRef(ctx context.Context, providerRef string) (*models.SubscriptionInvoice, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.SubscriptionInvoice, error)
	Update(ctx context.Context, i *models.SubscriptionInvoice) error
	// ListExpiredLinksPending — factures encore "pending", dont le lien
	// GeniusPay est expiré (ou sans date d'expiration connue) — candidates
	// à une régénération automatique.
	ListExpiredLinksPending(ctx context.Context, now time.Time) ([]models.SubscriptionInvoice, error)
	// ListOverdueUnescalated — factures "pending", échéance dépassée,
	// jamais encore suspendues pour CETTE facture (SuspendedAt nil).
	ListOverdueUnescalated(ctx context.Context, now time.Time) ([]models.SubscriptionInvoice, error)
	ListByUser(ctx context.Context, userID string, page, limit int) ([]models.SubscriptionInvoice, int64, error)
}

type gormSubscriptionInvoiceRepository struct {
	db *gorm.DB
}

func NewSubscriptionInvoiceRepository(db *gorm.DB) SubscriptionInvoiceRepository {
	return &gormSubscriptionInvoiceRepository{db: db}
}

func (r *gormSubscriptionInvoiceRepository) Create(ctx context.Context, i *models.SubscriptionInvoice) error {
	return r.db.WithContext(ctx).Create(i).Error
}

func (r *gormSubscriptionInvoiceRepository) FindByUserAndPeriod(ctx context.Context, userID string, periodStart time.Time) (*models.SubscriptionInvoice, error) {
	var i models.SubscriptionInvoice
	err := r.db.WithContext(ctx).First(&i, "user_id = ? AND period_start = ?", userID, periodStart).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &i, nil
}

func (r *gormSubscriptionInvoiceRepository) FindByProviderRef(ctx context.Context, providerRef string) (*models.SubscriptionInvoice, error) {
	var i models.SubscriptionInvoice
	err := r.db.WithContext(ctx).First(&i, "provider_ref = ?", providerRef).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &i, nil
}

func (r *gormSubscriptionInvoiceRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.SubscriptionInvoice, error) {
	var i models.SubscriptionInvoice
	err := r.db.WithContext(ctx).First(&i, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &i, nil
}

func (r *gormSubscriptionInvoiceRepository) Update(ctx context.Context, i *models.SubscriptionInvoice) error {
	return r.db.WithContext(ctx).Save(i).Error
}

func (r *gormSubscriptionInvoiceRepository) ListExpiredLinksPending(ctx context.Context, now time.Time) ([]models.SubscriptionInvoice, error) {
	var items []models.SubscriptionInvoice
	err := r.db.WithContext(ctx).
		Where("status = ? AND link_expires_at IS NOT NULL AND link_expires_at < ?", models.InvoicePending, now).
		Find(&items).Error
	return items, err
}

func (r *gormSubscriptionInvoiceRepository) ListOverdueUnescalated(ctx context.Context, now time.Time) ([]models.SubscriptionInvoice, error) {
	var items []models.SubscriptionInvoice
	err := r.db.WithContext(ctx).
		Where("status = ? AND due_at < ? AND suspended_at IS NULL", models.InvoicePending, now).
		Find(&items).Error
	return items, err
}

func (r *gormSubscriptionInvoiceRepository) ListByUser(ctx context.Context, userID string, page, limit int) ([]models.SubscriptionInvoice, int64, error) {
	var items []models.SubscriptionInvoice
	var total int64

	base := r.db.WithContext(ctx).Model(&models.SubscriptionInvoice{}).Where("user_id = ?", userID)
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
