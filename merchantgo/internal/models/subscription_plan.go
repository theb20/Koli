package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SubscriptionPlan est une formule d'abonnement gérée par l'admin (Gratuit,
// Starter, Pro, Business, Enterprise...). Prix en FCFA entiers — même
// convention que backend/ (pas de centimes). 0 sur un plafond = illimité.
type SubscriptionPlan struct {
	ID   uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Slug string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"slug"`
	Name string    `gorm:"type:varchar(100);not null" json:"name"`

	MaxProducts    int `gorm:"not null;default:0" json:"max_products"`
	MaxEmployees   int `gorm:"not null;default:0" json:"max_employees"`
	MaxOrders      int `gorm:"not null;default:0" json:"max_orders"` // par mois
	StorageLimitMb int `gorm:"not null;default:0" json:"storage_limit_mb"`

	// Commission prélevée malgré l'abonnement — souvent 0, mais un plan
	// "Starter" pourrait par exemple garder 2% en plus de l'abonnement.
	CommissionRate float64 `gorm:"not null;default:0" json:"commission_rate"`

	PriceMonthly int `gorm:"not null;default:0" json:"price_monthly"`
	PriceYearly  int `gorm:"not null;default:0" json:"price_yearly"`

	// JSON array de strings (ex: ["Support prioritaire","Mise en avant"]) —
	// affichage uniquement, jamais interprété côté serveur.
	Features string `gorm:"type:text" json:"features"`

	IsActive bool `gorm:"not null;default:true" json:"is_active"`
	Position int  `gorm:"not null;default:0" json:"position"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (p *SubscriptionPlan) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		p.ID = id
	}
	return nil
}

func (SubscriptionPlan) TableName() string { return "subscription_plans" }
