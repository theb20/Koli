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

	// Frais GeniusPay réellement prélevés sur les encaissements en ligne de
	// la période (voir config.GeniusPayFeeAmount, WalletTransaction) — ne
	// change ni NetAmount ni ce que le marchand perçoit : sert uniquement à
	// calculer la marge RÉELLE de Skignas (CommissionAmount −
	// GeniusPayFeeAmount), puisque GeniusPay prélève sa part avant même que
	// Skignas ne touche l'argent de la vente.
	GeniusPayFeeAmount int `gorm:"not null;default:0" json:"geniuspay_fee_amount"`

	Status SettlementStatus `gorm:"type:varchar(20);not null;default:finalized" json:"status"`
	SentAt *time.Time       `json:"sent_at,omitempty"`

	// Versement automatique Mobile Money (voir geniuspay.RequestCashout,
	// SettlementService.attemptPayout). "requested" ET "failed" sont tous
	// deux DÉFINITIFS, jamais retentés automatiquement : GeniusPay ne
	// documente aucun webhook de confirmation pour un cashout, donc on ne
	// peut jamais distinguer avec certitude un échec réel d'une simple
	// ambiguïté réseau (timeout après que l'argent est parti) — retenter
	// à l'aveugle risquerait un double paiement. "failed" nécessite une
	// vérification manuelle admin (voir AdminRetryPayout). Seuls
	// "skipped_no_method" / "skipped_non_positive" sont retentés aux
	// cycles suivants (le marchand peut configurer sa méthode entre-temps).
	PayoutStatus    string     `gorm:"type:varchar(30);not null;default:none" json:"payout_status"`
	PayoutReference string     `gorm:"type:varchar(150)" json:"payout_reference,omitempty"`
	PayoutOperator  string     `gorm:"type:varchar(30)" json:"payout_operator,omitempty"`
	PayoutPhone     string     `gorm:"type:varchar(30)" json:"payout_phone,omitempty"`
	PaidOutAt       *time.Time `json:"paid_out_at,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

const (
	PayoutNone               = "none"
	PayoutRequested          = "requested"
	PayoutSkippedNoMethod    = "skipped_no_method"
	PayoutSkippedNonPositive = "skipped_non_positive"
	PayoutFailed             = "failed"
)

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
