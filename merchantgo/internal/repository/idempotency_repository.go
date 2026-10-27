package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"merchantgo/internal/models"
)

// IdempotencyRepository implémente middleware.IdempotencyStore sur Postgres.
type IdempotencyRepository struct {
	db *gorm.DB
}

func NewIdempotencyRepository(db *gorm.DB) *IdempotencyRepository {
	return &IdempotencyRepository{db: db}
}

func (r *IdempotencyRepository) Find(ctx context.Context, scope, key string) (*models.IdempotencyKey, error) {
	var k models.IdempotencyKey
	err := r.db.WithContext(ctx).First(&k, "scope = ? AND key = ?", scope, key).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &k, err
}

// Create renvoie false si (scope, key) existe déjà — la contrainte unique
// tranche les courses entre deux requêtes simultanées.
func (r *IdempotencyRepository) Create(ctx context.Context, k *models.IdempotencyKey) (bool, error) {
	res := r.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(k)
	return res.RowsAffected == 1, res.Error
}

func (r *IdempotencyRepository) TakeOver(ctx context.Context, scope, key string, staleBefore time.Time) (bool, error) {
	res := r.db.WithContext(ctx).Model(&models.IdempotencyKey{}).
		Where("scope = ? AND key = ? AND status = ? AND locked_at < ?", scope, key, models.IdempotencyProcessing, staleBefore).
		Update("locked_at", time.Now())
	return res.RowsAffected == 1, res.Error
}

func (r *IdempotencyRepository) Complete(ctx context.Context, scope, key string, code int, body []byte, contentType string) error {
	return r.db.WithContext(ctx).Model(&models.IdempotencyKey{}).
		Where("scope = ? AND key = ?", scope, key).
		Updates(map[string]any{"status": models.IdempotencyCompleted, "response_code": code, "response_body": body, "content_type": contentType}).Error
}

func (r *IdempotencyRepository) Release(ctx context.Context, scope, key string) error {
	return r.db.WithContext(ctx).Where("scope = ? AND key = ? AND status = ?", scope, key, models.IdempotencyProcessing).
		Delete(&models.IdempotencyKey{}).Error
}

func (r *IdempotencyRepository) PurgeExpired(ctx context.Context, now time.Time) error {
	return r.db.WithContext(ctx).Where("expires_at < ?", now).Delete(&models.IdempotencyKey{}).Error
}
