package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ActorType distingue qui a déclenché une transition de statut, pour
// l'audit du workflow de validation.
type ActorType string

const (
	ActorMerchant ActorType = "merchant"
	ActorAdmin    ActorType = "admin"
)

// StatusEvent trace chaque transition de statut d'une candidature — journal
// d'audit immuable du workflow de validation (qui a approuvé/rejeté, quand,
// pourquoi), indépendant de l'état courant sur Application.
type StatusEvent struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ApplicationID uuid.UUID `gorm:"type:uuid;not null;index" json:"application_id"`
	FromStatus    Status    `gorm:"type:varchar(20);not null" json:"from_status"`
	ToStatus      Status    `gorm:"type:varchar(20);not null" json:"to_status"`
	ActorType     ActorType `gorm:"type:varchar(20);not null" json:"actor_type"`
	ActorID       string    `gorm:"type:varchar(100);not null" json:"actor_id"`
	Note          string    `gorm:"type:text" json:"note,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

func (e *StatusEvent) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		e.ID = id
	}
	return nil
}

func (StatusEvent) TableName() string {
	return "application_status_events"
}
