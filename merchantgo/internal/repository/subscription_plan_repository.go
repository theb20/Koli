package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"merchantgo/internal/models"
)

// SubscriptionPlanRepository abstrait l'accès au catalogue de formules
// d'abonnement, géré par l'admin.
type SubscriptionPlanRepository interface {
	List(ctx context.Context, activeOnly bool) ([]models.SubscriptionPlan, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.SubscriptionPlan, error)
	FindBySlug(ctx context.Context, slug string) (*models.SubscriptionPlan, error)
	Save(ctx context.Context, p *models.SubscriptionPlan) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
}

type gormSubscriptionPlanRepository struct {
	db *gorm.DB
}

func NewSubscriptionPlanRepository(db *gorm.DB) SubscriptionPlanRepository {
	return &gormSubscriptionPlanRepository{db: db}
}

func (r *gormSubscriptionPlanRepository) List(ctx context.Context, activeOnly bool) ([]models.SubscriptionPlan, error) {
	var plans []models.SubscriptionPlan
	q := r.db.WithContext(ctx).Order("position asc, price_monthly asc")
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	if err := q.Find(&plans).Error; err != nil {
		return nil, err
	}
	return plans, nil
}

func (r *gormSubscriptionPlanRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.SubscriptionPlan, error) {
	var p models.SubscriptionPlan
	err := r.db.WithContext(ctx).First(&p, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *gormSubscriptionPlanRepository) FindBySlug(ctx context.Context, slug string) (*models.SubscriptionPlan, error) {
	var p models.SubscriptionPlan
	err := r.db.WithContext(ctx).First(&p, "slug = ?", slug).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *gormSubscriptionPlanRepository) Save(ctx context.Context, p *models.SubscriptionPlan) error {
	return r.db.WithContext(ctx).Save(p).Error
}

func (r *gormSubscriptionPlanRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.SubscriptionPlan{}, "id = ?", id).Error
}

func (r *gormSubscriptionPlanRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.SubscriptionPlan{}).Count(&count).Error
	return count, err
}
