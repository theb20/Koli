package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PaymentProvider string

const (
	ProviderWinipayer PaymentProvider = "winipayer"
)

type PaymentState string

const (
	PaymentPending   PaymentState = "pending"
	PaymentSuccess   PaymentState = "success"
	PaymentFailed    PaymentState = "failed"
	PaymentCancelled PaymentState = "cancelled"
)

// PaymentIntent trace chaque paiement en ligne initié pour une commande
// koli — la source de vérité du STATUT de paiement d'une commande reste
// backend/ (Order.paymentStatus), cette table sert à merchantgo pour
// retrouver quelle commande correspond à quelle transaction passerelle
// (ProviderRef) et éviter de rappeler backend deux fois pour la même
// confirmation (voir payment_service.go, ConfirmPayment).
type PaymentIntent struct {
	ID          uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	Provider    PaymentProvider `gorm:"type:varchar(20);not null" json:"provider"`
	ProviderRef string          `gorm:"type:varchar(150);not null;uniqueIndex" json:"provider_ref"` // uuid WiniPayer

	// Une commande koli peut, en théorie, avoir plusieurs tentatives de
	// paiement (lien expiré, client relance) — pas d'unicité stricte sur
	// OrderID seul, seulement sur (OrderID, State=pending) via requête
	// applicative plutôt qu'une contrainte DB, pour rester simple.
	OrderID     string `gorm:"type:varchar(100);not null;index" json:"order_id"`
	OrderNumber string `gorm:"type:varchar(50);not null" json:"order_number"`

	Amount   int    `gorm:"not null" json:"amount"` // FCFA, unité entière
	Currency string `gorm:"type:varchar(10);not null;default:xof" json:"currency"`

	State       PaymentState `gorm:"type:varchar(20);not null;default:pending" json:"state"`
	OperatorRef string       `gorm:"type:varchar(150)" json:"operator_ref,omitempty"` // renvoyé par WiniPayer une fois payé
	CheckoutURL string       `gorm:"type:text" json:"-"`

	ConfirmedAt *time.Time `json:"confirmed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (p *PaymentIntent) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		p.ID = id
	}
	return nil
}

func (PaymentIntent) TableName() string { return "payment_intents" }
