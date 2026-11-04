package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MerchantPayoutMethod — destination Mobile Money d'un marchand pour les
// versements automatiques (relevés mensuels, voir SettlementService). Géré
// en self-service par le marchand (c'est SON argent, contrairement au
// modèle économique — voir handlers/billing_handler.go, réservé admin) :
// GET/PUT /api/v1/merchant/payout-method.
type MerchantPayoutMethod struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"user_id"`
	// orange_money | mtn_money | wave | moov_money — mêmes valeurs que le
	// paramètre `method` attendu par geniuspay.RequestCashout.
	Operator string `gorm:"type:varchar(30);not null" json:"operator"`
	Phone    string `gorm:"type:varchar(30);not null" json:"phone"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (p *MerchantPayoutMethod) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		p.ID = id
	}
	return nil
}

func (MerchantPayoutMethod) TableName() string { return "merchant_payout_methods" }
