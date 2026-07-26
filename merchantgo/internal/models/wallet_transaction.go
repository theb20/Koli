package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TransactionType string

const (
	// TransactionSale — vente réglée, crédite le solde du marchand (net
	// après commission). Les types payout/adjustment viendront avec le
	// système de retrait (chantier suivant).
	TransactionSale TransactionType = "sale"
)

// WalletTransaction trace chaque vente réglée pour un marchand — une ligne
// par (OrderID, UserID) : une commande qui mélange plusieurs marchands
// produit une ligne par marchand, chacune sur SA part du total (gross =
// somme de ses propres articles, jamais le total de la commande entière).
type WalletTransaction struct {
	ID     uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	UserID string          `gorm:"type:varchar(100);not null;uniqueIndex:idx_wallet_order_user" json:"user_id"`
	Type   TransactionType `gorm:"type:varchar(20);not null;default:sale" json:"type"`

	// Idempotence : backend/ peut rappeler le webhook order-paid (retry
	// réseau, double transition de statut) — l'index unique (order_id,
	// user_id) empêche un double crédit du même marchand pour la même
	// commande, voir billing_service.go RecordSale.
	OrderID     string `gorm:"type:varchar(100);not null;uniqueIndex:idx_wallet_order_user" json:"order_id"`
	OrderNumber string `gorm:"type:varchar(50);not null" json:"order_number"`

	GrossAmount      int         `gorm:"not null" json:"gross_amount"`
	CommissionRate   float64     `gorm:"not null;default:0" json:"commission_rate"`
	CommissionAmount int         `gorm:"not null;default:0" json:"commission_amount"`
	NetAmount        int         `gorm:"not null" json:"net_amount"`
	BillingMode      BillingMode `gorm:"type:varchar(20);not null" json:"billing_mode"`

	CreatedAt time.Time `json:"created_at"`
}

func (t *WalletTransaction) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		t.ID = id
	}
	return nil
}

func (WalletTransaction) TableName() string { return "wallet_transactions" }
