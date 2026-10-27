package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// IdempotencyKey enregistre le résultat d'une requête d'écriture portant
// l'en-tête Idempotency-Key (voir middleware/idempotency.go) : rejouée avec
// la même clé par le même appelant, elle renvoie la réponse enregistrée au
// lieu de ré-exécuter l'action. Même contrat que backend/ (table
// idempotency_keys côté Node).
type IdempotencyKey struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"`
	Scope        string    `gorm:"type:varchar(150);not null;uniqueIndex:idx_idempotency_scope_key"`
	Key          string    `gorm:"type:varchar(128);not null;uniqueIndex:idx_idempotency_scope_key"`
	Fingerprint  string    `gorm:"type:varchar(64);not null"`
	Status       string    `gorm:"type:varchar(20);not null;default:processing"` // processing | completed
	ResponseCode int
	ResponseBody []byte    `gorm:"type:bytea"`
	ContentType  string    `gorm:"type:varchar(100)"`
	LockedAt     time.Time `gorm:"not null"`
	ExpiresAt    time.Time `gorm:"not null;index"`
	CreatedAt    time.Time
}

const (
	IdempotencyProcessing = "processing"
	IdempotencyCompleted  = "completed"
)

func (k *IdempotencyKey) BeforeCreate(tx *gorm.DB) error {
	if k.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		k.ID = id
	}
	return nil
}

func (IdempotencyKey) TableName() string { return "idempotency_keys" }
