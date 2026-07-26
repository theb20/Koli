package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"merchantgo/internal/models"
)

// BillingRepository abstrait l'accès au choix économique d'un marchand.
type BillingRepository interface {
	FindByUserID(ctx context.Context, userID string) (*models.MerchantBilling, error)
	Save(ctx context.Context, b *models.MerchantBilling) error
}

type gormBillingRepository struct {
	db *gorm.DB
}

func NewBillingRepository(db *gorm.DB) BillingRepository {
	return &gormBillingRepository{db: db}
}

func (r *gormBillingRepository) FindByUserID(ctx context.Context, userID string) (*models.MerchantBilling, error) {
	var b models.MerchantBilling
	err := r.db.WithContext(ctx).Preload("SubscriptionPlan").First(&b, "user_id = ?", userID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &b, nil
}

func (r *gormBillingRepository) Save(ctx context.Context, b *models.MerchantBilling) error {
	return r.db.WithContext(ctx).Save(b).Error
}
