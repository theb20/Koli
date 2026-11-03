package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SettlementStatus string

const (
	SettlementFinalized SettlementStatus = "finalized"
	SettlementSent      SettlementStatus = "sent"
)

// MonthlySettlement — relevé mensuel figé des ventes/remboursements d'un
// marchand, calculé une fois pour toutes à partir de WalletTransaction une
// fois le mois clos (jamais recalculé après coup : une transaction ajoutée
// en retard pour ce mois apparaîtra sur le relevé SUIVANT, pas celui-ci).
// Skignas ENVOIE ce relevé au marchand (email + in-app) — jamais l'inverse.
// L'envoi lui-même vit côté backend/ (seul service avec un client email) :
// ce service calcule et expose les chiffres, voir Status/SentAt.
type MonthlySettlement struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID string    `gorm:"type:varchar(100);not null;uniqueIndex:idx_settlement_user_period" json:"user_id"`
	// Premier jour du mois couvert (ex: 2026-10-01 00:00 UTC) — borne basse incluse.
	PeriodStart time.Time `gorm:"not null;uniqueIndex:idx_settlement_user_period" json:"period_start"`
	// Premier jour du mois SUIVANT — borne haute EXCLUE (demi-ouvert),
	// jamais le dernier jour du mois (évite les pièges de fin de mois).
	PeriodEnd time.Time `gorm:"not null" json:"period_end"`

	GrossAmount      int `gorm:"not null" json:"gross_amount"`
	CommissionAmount int `gorm:"not null" json:"commission_amount"`
	// Net des ventes ET des remboursements de la période confondus — peut
	// être négatif si les remboursements dépassent les ventes du mois,
	// jamais plafonné à 0 ici (le relevé reflète la réalité comptable).
	NetAmount        int `gorm:"not null" json:"net_amount"`
	TransactionCount int `gorm:"not null" json:"transaction_count"`

	Status SettlementStatus `gorm:"type:varchar(20);not null;default:finalized" json:"status"`
	SentAt *time.Time       `json:"sent_at,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

func (s *MonthlySettlement) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		s.ID = id
	}
	return nil
}

func (MonthlySettlement) TableName() string { return "monthly_settlements" }
