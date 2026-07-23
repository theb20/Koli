package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DiditWebhookEvent journalise chaque webhook Didit reçu — sert à la fois
// de log de debug (corps brut conservé, pour diagnostiquer un échec de
// signature) et de clé d'idempotence (event_id unique) pour ignorer les
// livraisons dupliquées que Didit renvoie après un retry sur 5xx.
type DiditWebhookEvent struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	EventID     string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"event_id"`
	SessionID   string    `gorm:"type:varchar(100);index" json:"session_id"`
	WebhookType string    `gorm:"type:varchar(50);not null;index" json:"webhook_type"`
	Status      string    `gorm:"type:varchar(30)" json:"status"`
	VendorData  string    `gorm:"type:varchar(100);index" json:"vendor_data"`
	RawPayload  string    `gorm:"type:text;not null" json:"-"`
	CreatedAt   time.Time `json:"created_at"`
}

func (e *DiditWebhookEvent) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		e.ID = id
	}
	return nil
}

func (DiditWebhookEvent) TableName() string {
	return "didit_webhook_events"
}
