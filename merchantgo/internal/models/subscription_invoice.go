package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubscriptionInvoiceStatus string

const (
	InvoicePending SubscriptionInvoiceStatus = "pending"
	InvoicePaid    SubscriptionInvoiceStatus = "paid"
	// InvoiceOverdue — toujours impayée, mais le délai de grâce est dépassé
	// et le marchand a été automatiquement suspendu. Reste payable : un
	// paiement sur ProviderRef la fait quand même passer à "paid".
	InvoiceOverdue SubscriptionInvoiceStatus = "overdue"
)

// SubscriptionInvoice — facture mensuelle d'abonnement, générée et
// recouvrée AUTOMATIQUEMENT (voir services/subscription_billing_service.go
// et le ticker de cmd/server/main.go) : génération, relance (lien expiré),
// suspension du marchand au-delà du délai de grâce, et réactivation au
// paiement — tout sans intervention humaine par défaut. Un admin peut
// déroger manuellement (voir handlers/subscription_invoice_handler.go,
// AdminMarkPaid) sans que ça casse le cycle automatique du mois suivant.
type SubscriptionInvoice struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID string    `gorm:"type:varchar(100);not null;uniqueIndex:idx_subinvoice_user_period" json:"user_id"`
	// Premier jour du mois facturé — une seule facture par marchand et par
	// mois (idempotent, voir repository.FindByUserAndPeriod).
	PeriodStart time.Time `gorm:"not null;uniqueIndex:idx_subinvoice_user_period" json:"period_start"`

	Amount int                       `gorm:"not null" json:"amount"`
	Status SubscriptionInvoiceStatus `gorm:"type:varchar(20);not null;default:pending" json:"status"`

	// Référence GeniusPay du lien de paiement ACTUEL — change si le lien
	// expire et qu'il est régénéré (voir RelinkExpired), jamais réutilisée
	// une fois remplacée (ProviderRefHistory non conservé, pas nécessaire :
	// GeniusPay ne redonnera plus jamais un paiement sur l'ancienne ref).
	ProviderRef   string     `gorm:"type:varchar(150);not null;uniqueIndex" json:"provider_ref"`
	CheckoutURL   string     `gorm:"type:text" json:"checkout_url"`
	LinkExpiresAt *time.Time `json:"link_expires_at,omitempty"`

	// Échéance — passé cette date sans paiement, le marchand est suspendu
	// automatiquement (voir SellerStore.suspendedAt côté backend/).
	DueAt  time.Time  `gorm:"not null" json:"due_at"`
	PaidAt *time.Time `json:"paid_at,omitempty"`
	// Posé quand EscalateOverdue suspend le marchand pour CETTE facture —
	// sert à ne notifier/suspendre qu'une seule fois, jamais à chaque
	// passage du ticker.
	SuspendedAt *time.Time `json:"suspended_at,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (i *SubscriptionInvoice) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		i.ID = id
	}
	return nil
}

func (SubscriptionInvoice) TableName() string { return "subscription_invoices" }
