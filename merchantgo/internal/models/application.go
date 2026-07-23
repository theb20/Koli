package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Status suit le cycle de vie d'une candidature marchand, du brouillon à la
// décision finale. Une candidature rejetée peut être rouverte en draft par
// le marchand (édition + nouvelle soumission), plutôt que de créer une
// nouvelle candidature — l'historique reste sur ApplicationStatusEvent.
type Status string

const (
	StatusDraft         Status = "draft"
	StatusSubmitted     Status = "submitted"
	StatusPendingReview Status = "pending_review"
	StatusApproved      Status = "approved"
	StatusRejected      Status = "rejected"
)

// Reviewable indique si une candidature peut recevoir une décision admin
// (approve/reject) — seul un dossier soumis (ou déjà passé en revue
// explicite) peut être instruit.
func (s Status) Reviewable() bool {
	return s == StatusSubmitted || s == StatusPendingReview
}

// Application est la candidature d'inscription marchand — reprend les
// champs des étapes 3 à 10 du formulaire koli-business (les étapes 1-2,
// création de compte et vérification email/téléphone, restent gérées par le
// backend Node principal, qui émet le JWT que ce service se contente de
// vérifier). Les champs fichiers (photo, logo, documents KYC...) ne sont
// jamais stockés ici : koli-business les envoie d'abord à stockgo et ne
// transmet que l'URL retournée.
type Application struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"user_id"`
	Email  string    `gorm:"type:varchar(255);index" json:"email"`

	Status          Status     `gorm:"type:varchar(20);not null;default:draft;index" json:"status"`
	RejectionReason string     `gorm:"type:text" json:"rejection_reason,omitempty"`
	ReviewedBy      string     `gorm:"type:varchar(100)" json:"reviewed_by,omitempty"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty"`
	SubmittedAt     *time.Time `json:"submitted_at,omitempty"`

	// Étape 3 — Informations personnelles
	PhotoProfilURL string `gorm:"type:varchar(1024)" json:"photo_profil_url"`
	DateNaissance  string `gorm:"type:varchar(20)" json:"date_naissance"`
	PaysResidence  string `gorm:"type:varchar(100)" json:"pays_residence"`
	VilleResidence string `gorm:"type:varchar(100)" json:"ville_residence"`
	Langue         string `gorm:"type:varchar(10)" json:"langue"`
	Devise         string `gorm:"type:varchar(10)" json:"devise"`

	// Étape 4 — Informations entreprise
	NomBoutique         string `gorm:"type:varchar(120)" json:"nom_boutique"`
	LogoBoutiqueURL     string `gorm:"type:varchar(1024)" json:"logo_boutique_url"`
	BanniereBoutiqueURL string `gorm:"type:varchar(1024)" json:"banniere_boutique_url"`
	DescriptionBoutique string `gorm:"type:text" json:"description_boutique"`
	CategorieActivite   string `gorm:"type:varchar(100)" json:"categorie_activite"`
	SiteWeb             string `gorm:"type:varchar(255)" json:"site_web"`

	// Étape 5 — Informations légales
	TypeEntreprise string `gorm:"type:varchar(30)" json:"type_entreprise"`
	NumeroLegal    string `gorm:"type:varchar(100)" json:"numero_legal"`
	NumeroNCC      string `gorm:"type:varchar(100)" json:"numero_ncc"`
	FormeJuridique string `gorm:"type:varchar(50)" json:"forme_juridique"`
	NomEntreprise  string `gorm:"type:varchar(150)" json:"nom_entreprise"`
	AdresseSiege   string `gorm:"type:varchar(255)" json:"adresse_siege"`

	// Étape 6 — Adresse
	PaysAdresse     string `gorm:"type:varchar(100)" json:"pays_adresse"`
	RegionAdresse   string `gorm:"type:varchar(100)" json:"region_adresse"`
	VilleAdresse    string `gorm:"type:varchar(100)" json:"ville_adresse"`
	CodePostal      string `gorm:"type:varchar(20)" json:"code_postal"`
	AdresseComplete string `gorm:"type:varchar(255)" json:"adresse_complete"`

	// Étape 7 — Paiement
	TitulaireCompte      string `gorm:"type:varchar(150)" json:"titulaire_compte"`
	Banque               string `gorm:"type:varchar(100)" json:"banque"`
	Iban                 string `gorm:"type:varchar(50)" json:"iban"`
	Swift                string `gorm:"type:varchar(20)" json:"swift"`
	MobileMoneyOperateur string `gorm:"type:varchar(50)" json:"mobile_money_operateur"`
	MobileMoneyNumero    string `gorm:"type:varchar(30)" json:"mobile_money_numero"`
	MoyenPaiementPrefere string `gorm:"type:varchar(30)" json:"moyen_paiement_prefere"`

	// Étape 8 — KYC
	TypeDocument            string `gorm:"type:varchar(20)" json:"type_document"`
	DocumentIdentiteURL     string `gorm:"type:varchar(1024)" json:"document_identite_url"`
	SelfieURL               string `gorm:"type:varchar(1024)" json:"selfie_url"`
	JustificatifDomicileURL string `gorm:"type:varchar(1024)" json:"justificatif_domicile_url"`

	// Étape 9 — Livraison
	ZonesLivraison  string `gorm:"type:text" json:"zones_livraison"`
	ModesLivraison  string `gorm:"type:text" json:"modes_livraison"`
	DelaisLivraison string `gorm:"type:varchar(255)" json:"delais_livraison"`
	FraisLivraison  string `gorm:"type:varchar(255)" json:"frais_livraison"`
	RetraitMagasin  bool   `gorm:"not null;default:false" json:"retrait_magasin"`

	// Étape 10 — Paramètres boutique
	DomainePersonnalise string `gorm:"type:varchar(255)" json:"domaine_personnalise"`
	HorairesOuverture   string `gorm:"type:varchar(255)" json:"horaires_ouverture"`
	Facebook            string `gorm:"type:varchar(255)" json:"facebook"`
	Instagram           string `gorm:"type:varchar(255)" json:"instagram"`
	Whatsapp            string `gorm:"type:varchar(50)" json:"whatsapp"`
	PolitiqueRetour     string `gorm:"type:text" json:"politique_retour"`
	Cgv                 bool   `gorm:"not null;default:false" json:"cgv"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate génère un UUID v7 (ordonné dans le temps) si absent — même
// convention que stockgo.
func (a *Application) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		a.ID = id
	}
	return nil
}

func (Application) TableName() string {
	return "applications"
}

// Editable indique si le marchand peut encore modifier sa candidature —
// verrouillée dès qu'elle entre en revue, pour que l'admin instruise un
// dossier stable.
func (a *Application) Editable() bool {
	return a.Status == StatusDraft || a.Status == StatusRejected
}
