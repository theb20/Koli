package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"merchantgo/internal/models"
)

// ErrDuplicateEvent signale un event_id déjà traité — Didit redélivre le
// même webhook après un retry sur 5xx, ce n'est pas une erreur mais un cas
// à ignorer silencieusement côté service.
var ErrDuplicateEvent = errors.New("repository: événement déjà traité")

// DiditEventRepository persiste le journal des webhooks Didit — la
// contrainte unique sur event_id sert directement de clé d'idempotence.
type DiditEventRepository interface {
	Create(ctx context.Context, event *models.DiditWebhookEvent) error
}

type gormDiditEventRepository struct {
	db *gorm.DB
}

func NewDiditEventRepository(db *gorm.DB) DiditEventRepository {
	return &gormDiditEventRepository{db: db}
}

func (r *gormDiditEventRepository) Create(ctx context.Context, event *models.DiditWebhookEvent) error {
	err := r.db.WithContext(ctx).Create(event).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrDuplicateEvent
	}
	return err
}
