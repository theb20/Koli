package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/middleware"
	"merchantgo/internal/models"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
)

type ApplicationHandler struct {
	service services.ApplicationService
	logger  *zap.Logger
}

func NewApplicationHandler(service services.ApplicationService, logger *zap.Logger) *ApplicationHandler {
	return &ApplicationHandler{service: service, logger: logger}
}

// saveDraftRequest reprend, en camelCase, les champs des étapes 3 à 10 de
// RegisterFormData (koli-business/src/pages/register/types.ts) — les
// champs fichiers (photoProfil, logoBoutique, documentIdentite...) sont ici
// des URL déjà uploadées vers stockgo, jamais des fichiers bruts.
type saveDraftRequest struct {
	PhotoProfilURL string `json:"photoProfilUrl"`
	DateNaissance  string `json:"dateNaissance"`
	PaysResidence  string `json:"paysResidence"`
	VilleResidence string `json:"villeResidence"`
	Langue         string `json:"langue"`
	Devise         string `json:"devise"`

	NomBoutique         string `json:"nomBoutique"`
	LogoBoutiqueURL     string `json:"logoBoutiqueUrl"`
	BanniereBoutiqueURL string `json:"banniereBoutiqueUrl"`
	DescriptionBoutique string `json:"descriptionBoutique"`
	CategorieActivite   string `json:"categorieActivite"`
	SiteWeb             string `json:"siteWeb"`

	TypeEntreprise string `json:"typeEntreprise" binding:"omitempty,oneof=individuel auto-entrepreneur societe"`
	NumeroLegal    string `json:"numeroLegal"`
	NumeroNCC      string `json:"numeroNCC"`
	FormeJuridique string `json:"formeJuridique"`
	NomEntreprise  string `json:"nomEntreprise"`
	AdresseSiege   string `json:"adresseSiege"`

	PaysAdresse     string `json:"paysAdresse"`
	RegionAdresse   string `json:"regionAdresse"`
	VilleAdresse    string `json:"villeAdresse"`
	CodePostal      string `json:"codePostal"`
	AdresseComplete string `json:"adresseComplete"`

	TitulaireCompte      string `json:"titulaireCompte"`
	Banque               string `json:"banque"`
	Iban                 string `json:"iban"`
	Swift                string `json:"swift"`
	MobileMoneyOperateur string `json:"mobileMoneyOperateur"`
	MobileMoneyNumero    string `json:"mobileMoneyNumero"`
	MoyenPaiementPrefere string `json:"moyenPaiementPrefere" binding:"omitempty,oneof=mobile_money virement_bancaire"`

	TypeDocument            string `json:"typeDocument" binding:"omitempty,oneof=cni passeport permis"`
	DocumentIdentiteURL     string `json:"documentIdentiteUrl"`
	SelfieURL               string `json:"selfieUrl"`
	JustificatifDomicileURL string `json:"justificatifDomicileUrl"`

	ZonesLivraison  string `json:"zonesLivraison"`
	ModesLivraison  string `json:"modesLivraison"`
	DelaisLivraison string `json:"delaisLivraison"`
	FraisLivraison  string `json:"fraisLivraison"`
	RetraitMagasin  bool   `json:"retraitMagasin"`

	DomainePersonnalise string `json:"domainePersonnalise"`
	HorairesOuverture   string `json:"horairesOuverture"`
	Facebook            string `json:"facebook"`
	Instagram           string `json:"instagram"`
	Whatsapp            string `json:"whatsapp"`
	PolitiqueRetour     string `json:"politiqueRetour"`
	Cgv                 bool   `json:"cgv"`
}

func (r saveDraftRequest) toInput() services.ApplicationInput {
	return services.ApplicationInput{
		PhotoProfilURL: r.PhotoProfilURL, DateNaissance: r.DateNaissance, PaysResidence: r.PaysResidence,
		VilleResidence: r.VilleResidence, Langue: r.Langue, Devise: r.Devise,
		NomBoutique: r.NomBoutique, LogoBoutiqueURL: r.LogoBoutiqueURL, BanniereBoutiqueURL: r.BanniereBoutiqueURL,
		DescriptionBoutique: r.DescriptionBoutique, CategorieActivite: r.CategorieActivite, SiteWeb: r.SiteWeb,
		TypeEntreprise: r.TypeEntreprise, NumeroLegal: r.NumeroLegal, NumeroNCC: r.NumeroNCC,
		FormeJuridique: r.FormeJuridique, NomEntreprise: r.NomEntreprise, AdresseSiege: r.AdresseSiege,
		PaysAdresse: r.PaysAdresse, RegionAdresse: r.RegionAdresse, VilleAdresse: r.VilleAdresse,
		CodePostal: r.CodePostal, AdresseComplete: r.AdresseComplete,
		TitulaireCompte: r.TitulaireCompte, Banque: r.Banque, Iban: r.Iban, Swift: r.Swift,
		MobileMoneyOperateur: r.MobileMoneyOperateur, MobileMoneyNumero: r.MobileMoneyNumero,
		MoyenPaiementPrefere: r.MoyenPaiementPrefere,
		TypeDocument:         r.TypeDocument, DocumentIdentiteURL: r.DocumentIdentiteURL, SelfieURL: r.SelfieURL,
		JustificatifDomicileURL: r.JustificatifDomicileURL,
		ZonesLivraison:          r.ZonesLivraison, ModesLivraison: r.ModesLivraison, DelaisLivraison: r.DelaisLivraison,
		FraisLivraison: r.FraisLivraison, RetraitMagasin: r.RetraitMagasin,
		DomainePersonnalise: r.DomainePersonnalise, HorairesOuverture: r.HorairesOuverture,
		Facebook: r.Facebook, Instagram: r.Instagram, Whatsapp: r.Whatsapp,
		PolitiqueRetour: r.PolitiqueRetour, Cgv: r.Cgv,
	}
}

type applicationResponse struct {
	ID              string  `json:"id"`
	Status          string  `json:"status"`
	RejectionReason string  `json:"rejectionReason,omitempty"`
	SubmittedAt     *string `json:"submittedAt,omitempty"`
	ReviewedAt      *string `json:"reviewedAt,omitempty"`
	CreatedAt       string  `json:"createdAt"`
	UpdatedAt       string  `json:"updatedAt"`

	saveDraftRequest
}

func toApplicationResponse(app *models.Application) applicationResponse {
	resp := applicationResponse{
		ID:              app.ID.String(),
		Status:          string(app.Status),
		RejectionReason: app.RejectionReason,
		CreatedAt:       app.CreatedAt.Format(timeLayout),
		UpdatedAt:       app.UpdatedAt.Format(timeLayout),
		saveDraftRequest: saveDraftRequest{
			PhotoProfilURL: app.PhotoProfilURL, DateNaissance: app.DateNaissance, PaysResidence: app.PaysResidence,
			VilleResidence: app.VilleResidence, Langue: app.Langue, Devise: app.Devise,
			NomBoutique: app.NomBoutique, LogoBoutiqueURL: app.LogoBoutiqueURL, BanniereBoutiqueURL: app.BanniereBoutiqueURL,
			DescriptionBoutique: app.DescriptionBoutique, CategorieActivite: app.CategorieActivite, SiteWeb: app.SiteWeb,
			TypeEntreprise: app.TypeEntreprise, NumeroLegal: app.NumeroLegal, NumeroNCC: app.NumeroNCC,
			FormeJuridique: app.FormeJuridique, NomEntreprise: app.NomEntreprise, AdresseSiege: app.AdresseSiege,
			PaysAdresse: app.PaysAdresse, RegionAdresse: app.RegionAdresse, VilleAdresse: app.VilleAdresse,
			CodePostal: app.CodePostal, AdresseComplete: app.AdresseComplete,
			TitulaireCompte: app.TitulaireCompte, Banque: app.Banque, Iban: app.Iban, Swift: app.Swift,
			MobileMoneyOperateur: app.MobileMoneyOperateur, MobileMoneyNumero: app.MobileMoneyNumero,
			MoyenPaiementPrefere: app.MoyenPaiementPrefere,
			TypeDocument:         app.TypeDocument, DocumentIdentiteURL: app.DocumentIdentiteURL, SelfieURL: app.SelfieURL,
			JustificatifDomicileURL: app.JustificatifDomicileURL,
			ZonesLivraison:          app.ZonesLivraison, ModesLivraison: app.ModesLivraison, DelaisLivraison: app.DelaisLivraison,
			FraisLivraison: app.FraisLivraison, RetraitMagasin: app.RetraitMagasin,
			DomainePersonnalise: app.DomainePersonnalise, HorairesOuverture: app.HorairesOuverture,
			Facebook: app.Facebook, Instagram: app.Instagram, Whatsapp: app.Whatsapp,
			PolitiqueRetour: app.PolitiqueRetour, Cgv: app.Cgv,
		},
	}
	if app.SubmittedAt != nil {
		s := app.SubmittedAt.Format(timeLayout)
		resp.SubmittedAt = &s
	}
	if app.ReviewedAt != nil {
		s := app.ReviewedAt.Format(timeLayout)
		resp.ReviewedAt = &s
	}
	return resp
}

const timeLayout = "2006-01-02T15:04:05Z07:00"

// SaveDraft godoc
// @Summary Créer ou mettre à jour ma candidature marchand
// @Router /api/v1/applications/me [put]
func (h *ApplicationHandler) SaveDraft(c *gin.Context) {
	var req saveDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Corps de requête invalide", err))
		return
	}

	app, err := h.service.SaveDraft(c.Request.Context(), middleware.UserID(c), middleware.Email(c), req.toInput())
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, toApplicationResponse(app))
}

// Submit godoc
// @Summary Soumettre ma candidature pour revue
// @Router /api/v1/applications/me/submit [post]
func (h *ApplicationHandler) Submit(c *gin.Context) {
	app, err := h.service.Submit(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, toApplicationResponse(app))
}

// GetMine godoc
// @Summary Consulter ma candidature
// @Router /api/v1/applications/me [get]
func (h *ApplicationHandler) GetMine(c *gin.Context) {
	app, err := h.service.GetMine(c.Request.Context(), middleware.UserID(c))
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, toApplicationResponse(app))
}
