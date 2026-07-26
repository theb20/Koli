package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BillingMode est le modèle économique choisi par un marchand à
// l'inscription — voir prompt "système marchand complet" (25/07).
type BillingMode string

const (
	BillingModeCommission   BillingMode = "commission"
	BillingModeSubscription BillingMode = "subscription"
)

// MerchantBilling est le choix économique d'un marchand — une ligne par
// UserID (backend/ User.id, jamais de FK réelle : bases séparées). Tant
// qu'aucune ligne n'existe pour un marchand, il n'a pas encore choisi ; le
// calcul de commission retombe alors sur un taux par défaut (voir
// billing_service.go).
type MerchantBilling struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"user_id"`

	Mode BillingMode `gorm:"type:varchar(20);not null" json:"mode"`

	// Utilisé seulement si Mode = commission. Ignoré (mais conservé tel
	// quel) si Mode = subscription — c'est alors SubscriptionPlan.CommissionRate
	// qui s'applique (souvent 0).
	CommissionRate float64 `gorm:"not null;default:5" json:"commission_rate"`

	SubscriptionPlanID *uuid.UUID         `gorm:"type:uuid" json:"subscription_plan_id,omitempty"`
	SubscriptionPlan   *SubscriptionPlan  `gorm:"foreignKey:SubscriptionPlanID" json:"subscription_plan,omitempty"`

	// Verrou anti-changement — voir CanChange(). Mis à jour à chaque
	// changement de mode réussi, y compris le tout premier choix.
	LastChangedAt time.Time `gorm:"not null" json:"last_changed_at"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (b *MerchantBilling) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		b.ID = id
	}
	if b.LastChangedAt.IsZero() {
		b.LastChangedAt = time.Now()
	}
	return nil
}

func (MerchantBilling) TableName() string { return "merchant_billings" }

// CanChange indique si le marchand peut changer de mode maintenant — verrou
// configurable (30 jours par défaut, BILLING_LOCK_DAYS), pour ne pas
// compliquer le calcul de commission sur des commandes déjà en cours au
// moment du changement.
func (b *MerchantBilling) CanChange(lockDays int) bool {
	if lockDays <= 0 {
		return true
	}
	return time.Since(b.LastChangedAt) >= time.Duration(lockDays)*24*time.Hour
}
