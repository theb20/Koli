package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"merchantgo/internal/models"
)

type PayoutMethodRepository interface {
	FindByUserID(ctx context.Context, userID string) (*models.MerchantPayoutMethod, error)
	Upsert(ctx context.Context, p *models.MerchantPayoutMethod) error
}

type gormPayoutMethodRepository struct {
	db *gorm.DB
}

func NewPayoutMethodRepository(db *gorm.DB) PayoutMethodRepository {
	return &gormPayoutMethodRepository{db: db}
}

func (r *gormPayoutMethodRepository) FindByUserID(ctx context.Context, userID string) (*models.MerchantPayoutMethod, error) {
	var p models.MerchantPayoutMethod
	err := r.db.WithContext(ctx).First(&p, "user_id = ?", userID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

// Upsert crée ou met à jour la méthode de versement du marchand — une seule
// ligne par UserID (voir uniqueIndex), jamais d'historique conservé : seule
// la destination ACTUELLE importe, un changement remplace la précédente.
func (r *gormPayoutMethodRepository) Upsert(ctx context.Context, p *models.MerchantPayoutMethod) error {
	existing, err := r.FindByUserID(ctx, p.UserID)
	if err != nil {
		return err
	}
	if existing == nil {
		return r.db.WithContext(ctx).Create(p).Error
	}
	existing.Operator = p.Operator
	existing.Phone = p.Phone
	return r.db.WithContext(ctx).Save(existing).Error
}
