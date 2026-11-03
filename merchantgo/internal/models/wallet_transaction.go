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
	// TransactionRefund — reprise (NetAmount négatif) de la part d'un
	// marchand sur les articles d'un retour remboursé au client. Voir
	// wallet_service.go RecordRefund.
	TransactionRefund TransactionType = "refund"
)

// WalletTransaction trace chaque vente réglée (et chaque remboursement
// repris) pour un marchand — une ligne par (OrderID, UserID, RefID) : une
// commande qui mélange plusieurs marchands produit une ligne par marchand,
// chacune sur SA part (gross = somme de ses propres articles concernés,
// jamais le total de la commande entière). RefID vaut toujours OrderID pour
// une vente ; pour un remboursement, c'est l'ID du retour (OrderReturn côté
// backend/) — une même commande peut avoir plusieurs retours distincts.
type WalletTransaction struct {
	ID     uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	UserID string          `gorm:"type:varchar(100);not null;uniqueIndex:idx_wallet_user_ref" json:"user_id"`
	Type   TransactionType `gorm:"type:varchar(20);not null;default:sale" json:"type"`

	// Idempotence : backend/ peut rappeler un webhook (retry réseau, double
	// transition de statut) — l'index unique (user_id, ref_id) empêche un
	// double crédit/débit du même marchand pour la même vente ou le même
	// retour. RefID = OrderID pour une vente, ID du retour pour un
	// remboursement (voir commentaire du type ci-dessus) — NE JAMAIS
	// utiliser OrderID seul ici, une commande peut avoir plusieurs retours.
	RefID       string `gorm:"type:varchar(100);not null;uniqueIndex:idx_wallet_user_ref" json:"ref_id"`
	OrderID     string `gorm:"type:varchar(100);not null" json:"order_id"`
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
