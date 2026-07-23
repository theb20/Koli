package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/utils"
)

// ApplicationInput porte les champs métier éditables d'une candidature
// (étapes 3 à 10 du formulaire koli-business) — le handler HTTP construit
// cette struct depuis le JSON reçu, indépendamment de GORM/Gin.
type ApplicationInput struct {
	PhotoProfilURL string
	DateNaissance  string
	PaysResidence  string
	VilleResidence string
	Langue         string
	Devise         string

	NomBoutique         string
	LogoBoutiqueURL     string
	BanniereBoutiqueURL string
	DescriptionBoutique string
	CategorieActivite   string
	SiteWeb             string

	TypeEntreprise string
	NumeroLegal    string
	NumeroNCC      string
	FormeJuridique string
	NomEntreprise  string
	AdresseSiege   string

	PaysAdresse     string
	RegionAdresse   string
	VilleAdresse    string
	CodePostal      string
	AdresseComplete string

	TitulaireCompte      string
	Banque               string
	Iban                 string
	Swift                string
	MobileMoneyOperateur string
	MobileMoneyNumero    string
	MoyenPaiementPrefere string

	TypeDocument            string
	DocumentIdentiteURL     string
	SelfieURL               string
	JustificatifDomicileURL string

	ZonesLivraison  string
	ModesLivraison  string
	DelaisLivraison string
	FraisLivraison  string
	RetraitMagasin  bool

	DomainePersonnalise string
	HorairesOuverture   string
	Facebook            string
	Instagram           string
	Whatsapp            string
	PolitiqueRetour     string
	Cgv                 bool
}

func (in ApplicationInput) applyTo(app *models.Application) {
	app.PhotoProfilURL = in.PhotoProfilURL
	app.DateNaissance = in.DateNaissance
	app.PaysResidence = in.PaysResidence
	app.VilleResidence = in.VilleResidence
	app.Langue = in.Langue
	app.Devise = in.Devise

	app.NomBoutique = in.NomBoutique
	app.LogoBoutiqueURL = in.LogoBoutiqueURL
	app.BanniereBoutiqueURL = in.BanniereBoutiqueURL
	app.DescriptionBoutique = in.DescriptionBoutique
	app.CategorieActivite = in.CategorieActivite
	app.SiteWeb = in.SiteWeb

	app.TypeEntreprise = in.TypeEntreprise
	app.NumeroLegal = in.NumeroLegal
	app.NumeroNCC = in.NumeroNCC
	app.FormeJuridique = in.FormeJuridique
	app.NomEntreprise = in.NomEntreprise
	app.AdresseSiege = in.AdresseSiege

	app.PaysAdresse = in.PaysAdresse
	app.RegionAdresse = in.RegionAdresse
	app.VilleAdresse = in.VilleAdresse
	app.CodePostal = in.CodePostal
	app.AdresseComplete = in.AdresseComplete

	app.TitulaireCompte = in.TitulaireCompte
	app.Banque = in.Banque
	app.Iban = in.Iban
	app.Swift = in.Swift
	app.MobileMoneyOperateur = in.MobileMoneyOperateur
	app.MobileMoneyNumero = in.MobileMoneyNumero
	app.MoyenPaiementPrefere = in.MoyenPaiementPrefere

	app.TypeDocument = in.TypeDocument
	app.DocumentIdentiteURL = in.DocumentIdentiteURL
	app.SelfieURL = in.SelfieURL
	app.JustificatifDomicileURL = in.JustificatifDomicileURL

	app.ZonesLivraison = in.ZonesLivraison
	app.ModesLivraison = in.ModesLivraison
	app.DelaisLivraison = in.DelaisLivraison
	app.FraisLivraison = in.FraisLivraison
	app.RetraitMagasin = in.RetraitMagasin

	app.DomainePersonnalise = in.DomainePersonnalise
	app.HorairesOuverture = in.HorairesOuverture
	app.Facebook = in.Facebook
	app.Instagram = in.Instagram
	app.Whatsapp = in.Whatsapp
	app.PolitiqueRetour = in.PolitiqueRetour
	app.Cgv = in.Cgv
}

// requiredForSubmit liste les champs indispensables pour qu'un dossier soit
// instruisible par un admin — validation métier à la soumission finale,
// distincte de la validation "forme" (JSON bien formé) faite côté handler.
func (in ApplicationInput) missingRequiredFields() []string {
	var missing []string
	check := func(name, value string) {
		if strings.TrimSpace(value) == "" {
			missing = append(missing, name)
		}
	}
	check("nomBoutique", in.NomBoutique)
	check("typeEntreprise", in.TypeEntreprise)
	check("numeroLegal", in.NumeroLegal)
	check("paysAdresse", in.PaysAdresse)
	check("villeAdresse", in.VilleAdresse)
	check("adresseComplete", in.AdresseComplete)
	check("moyenPaiementPrefere", in.MoyenPaiementPrefere)
	check("typeDocument", in.TypeDocument)
	check("documentIdentiteUrl", in.DocumentIdentiteURL)
	check("selfieUrl", in.SelfieURL)
	if !in.Cgv {
		missing = append(missing, "cgv")
	}
	return missing
}

type ListResult struct {
	Applications []models.Application
	Total        int64
	Page         int
	Limit        int
	TotalPages   int
}

type ApplicationService interface {
	SaveDraft(ctx context.Context, userID, email string, in ApplicationInput) (*models.Application, error)
	Submit(ctx context.Context, userID string) (*models.Application, error)
	GetMine(ctx context.Context, userID string) (*models.Application, error)
	List(ctx context.Context, params repository.ListParams) (*ListResult, error)
	Get(ctx context.Context, id uuid.UUID) (*models.Application, error)
	Approve(ctx context.Context, id uuid.UUID, adminID, note string) (*models.Application, error)
	Reject(ctx context.Context, id uuid.UUID, adminID, reason string) (*models.Application, error)
}

type applicationService struct {
	repo   repository.ApplicationRepository
	logger *zap.Logger
}

func NewApplicationService(repo repository.ApplicationRepository, logger *zap.Logger) ApplicationService {
	return &applicationService{repo: repo, logger: logger}
}

// SaveDraft crée ou met à jour la candidature du marchand authentifié.
// Autorisée tant que le dossier n'est pas verrouillé en revue (draft ou
// rejeté — un rejet redevient implicitement un brouillon éditable, pour que
// le marchand corrige et resoumette sans créer un second dossier).
func (s *applicationService) SaveDraft(ctx context.Context, userID, email string, in ApplicationInput) (*models.Application, error) {
	app, err := s.repo.FindByUserID(ctx, userID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		app = &models.Application{UserID: userID, Email: email, Status: models.StatusDraft}
		in.applyTo(app)
		if err := s.repo.Save(ctx, app); err != nil {
			return nil, utils.ErrInternal(fmt.Errorf("création candidature: %w", err))
		}
		return app, nil
	}
	if err != nil {
		return nil, utils.ErrInternal(err)
	}

	if !app.Editable() {
		return nil, utils.ErrConflict("Candidature déjà en cours de revue, modification impossible")
	}

	wasRejected := app.Status == models.StatusRejected
	app.Email = email
	in.applyTo(app)
	app.Status = models.StatusDraft

	if err := s.repo.Save(ctx, app); err != nil {
		return nil, utils.ErrInternal(fmt.Errorf("mise à jour candidature: %w", err))
	}

	if wasRejected {
		s.recordEvent(ctx, app.ID, models.StatusRejected, models.StatusDraft, models.ActorMerchant, userID, "Dossier corrigé après rejet")
	}

	return app, nil
}

func (s *applicationService) Submit(ctx context.Context, userID string) (*models.Application, error) {
	app, err := s.findByUserIDOrNotFound(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !app.Editable() {
		return nil, utils.ErrConflict("Candidature déjà soumise")
	}

	in := ApplicationInput{
		NomBoutique: app.NomBoutique, TypeEntreprise: app.TypeEntreprise, NumeroLegal: app.NumeroLegal,
		PaysAdresse: app.PaysAdresse, VilleAdresse: app.VilleAdresse, AdresseComplete: app.AdresseComplete,
		MoyenPaiementPrefere: app.MoyenPaiementPrefere, TypeDocument: app.TypeDocument,
		DocumentIdentiteURL: app.DocumentIdentiteURL, SelfieURL: app.SelfieURL, Cgv: app.Cgv,
	}
	if missing := in.missingRequiredFields(); len(missing) > 0 {
		return nil, utils.ErrBadRequest(fmt.Sprintf("Champs obligatoires manquants: %s", strings.Join(missing, ", ")), nil)
	}

	from := app.Status
	now := time.Now()
	app.Status = models.StatusSubmitted
	app.SubmittedAt = &now
	app.RejectionReason = ""

	if err := s.repo.Save(ctx, app); err != nil {
		return nil, utils.ErrInternal(fmt.Errorf("soumission candidature: %w", err))
	}
	s.recordEvent(ctx, app.ID, from, models.StatusSubmitted, models.ActorMerchant, userID, "")

	return app, nil
}

func (s *applicationService) GetMine(ctx context.Context, userID string) (*models.Application, error) {
	return s.findByUserIDOrNotFound(ctx, userID)
}

func (s *applicationService) List(ctx context.Context, params repository.ListParams) (*ListResult, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 100 {
		params.Limit = 20
	}

	apps, total, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}

	totalPages := int(total) / params.Limit
	if int(total)%params.Limit != 0 {
		totalPages++
	}

	return &ListResult{
		Applications: apps,
		Total:        total,
		Page:         params.Page,
		Limit:        params.Limit,
		TotalPages:   totalPages,
	}, nil
}

func (s *applicationService) Get(ctx context.Context, id uuid.UUID) (*models.Application, error) {
	return s.findByIDOrNotFound(ctx, id)
}

// Approve fait basculer une candidature en attente vers "approved" — seul
// koli-admin peut l'appeler (RequireAdmin en amont dans le routeur).
func (s *applicationService) Approve(ctx context.Context, id uuid.UUID, adminID, note string) (*models.Application, error) {
	app, err := s.findByIDOrNotFound(ctx, id)
	if err != nil {
		return nil, err
	}
	if !app.Status.Reviewable() {
		return nil, utils.ErrConflict("Candidature déjà instruite")
	}

	from := app.Status
	now := time.Now()
	app.Status = models.StatusApproved
	app.ReviewedBy = adminID
	app.ReviewedAt = &now
	app.RejectionReason = ""

	if err := s.repo.Save(ctx, app); err != nil {
		return nil, utils.ErrInternal(fmt.Errorf("approbation candidature: %w", err))
	}
	s.recordEvent(ctx, app.ID, from, models.StatusApproved, models.ActorAdmin, adminID, note)

	return app, nil
}

func (s *applicationService) Reject(ctx context.Context, id uuid.UUID, adminID, reason string) (*models.Application, error) {
	if strings.TrimSpace(reason) == "" {
		return nil, utils.ErrBadRequest("Motif de rejet requis", nil)
	}

	app, err := s.findByIDOrNotFound(ctx, id)
	if err != nil {
		return nil, err
	}
	if !app.Status.Reviewable() {
		return nil, utils.ErrConflict("Candidature déjà instruite")
	}

	from := app.Status
	now := time.Now()
	app.Status = models.StatusRejected
	app.ReviewedBy = adminID
	app.ReviewedAt = &now
	app.RejectionReason = reason

	if err := s.repo.Save(ctx, app); err != nil {
		return nil, utils.ErrInternal(fmt.Errorf("rejet candidature: %w", err))
	}
	s.recordEvent(ctx, app.ID, from, models.StatusRejected, models.ActorAdmin, adminID, reason)

	return app, nil
}

func (s *applicationService) findByUserIDOrNotFound(ctx context.Context, userID string) (*models.Application, error) {
	app, err := s.repo.FindByUserID(ctx, userID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, utils.ErrNotFound("Aucune candidature trouvée")
	}
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	return app, nil
}

func (s *applicationService) findByIDOrNotFound(ctx context.Context, id uuid.UUID) (*models.Application, error) {
	app, err := s.repo.FindByID(ctx, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, utils.ErrNotFound("Candidature introuvable")
	}
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	return app, nil
}

// recordEvent journalise une transition de statut ; un échec d'écriture de
// l'audit ne doit pas faire échouer l'opération métier déjà persistée, donc
// seulement logué.
func (s *applicationService) recordEvent(ctx context.Context, appID uuid.UUID, from, to models.Status, actorType models.ActorType, actorID, note string) {
	event := &models.StatusEvent{
		ApplicationID: appID,
		FromStatus:    from,
		ToStatus:      to,
		ActorType:     actorType,
		ActorID:       actorID,
		Note:          note,
	}
	if err := s.repo.CreateStatusEvent(ctx, event); err != nil {
		s.logger.Error("échec enregistrement événement de statut", zap.Error(err), zap.String("application_id", appID.String()))
	}
}
