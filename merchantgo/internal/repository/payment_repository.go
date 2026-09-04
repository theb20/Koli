package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"merchantgo/internal/models"
)

type PaymentRepository interface {
	Create(ctx context.Context, p *models.PaymentIntent) error
	FindByProviderRef(ctx context.Context, providerRef string) (*models.PaymentIntent, error)
	Update(ctx context.Context, p *models.PaymentIntent) error
}

type gormPaymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) PaymentRepository {
	return &gormPaymentRepository{db: db}
}

func (r *gormPaymentRepository) Create(ctx context.Context, p *models.PaymentIntent) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *gormPaymentRepository) FindByProviderRef(ctx context.Context, providerRef string) (*models.PaymentIntent, error) {
	var p models.PaymentIntent
	err := r.db.WithContext(ctx).First(&p, "provider_ref = ?", providerRef).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *gormPaymentRepository) Update(ctx context.Context, p *models.PaymentIntent) error {
	return r.db.WithContext(ctx).Save(p).Error
}
