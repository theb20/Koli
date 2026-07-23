package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"merchantgo/internal/models"
)

// ListParams regroupe pagination et filtre de statut pour
// GET /admin/applications.
type ListParams struct {
	Page   int
	Limit  int
	Status models.Status // vide = tous statuts
}

// ApplicationRepository abstrait l'accès aux candidatures — isole GORM du
// reste du code et permet de tester le service sans base réelle.
type ApplicationRepository interface {
	FindByUserID(ctx context.Context, userID string) (*models.Application, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.Application, error)
	Save(ctx context.Context, app *models.Application) error
	List(ctx context.Context, params ListParams) ([]models.Application, int64, error)
	CreateStatusEvent(ctx context.Context, event *models.StatusEvent) error
}

type gormApplicationRepository struct {
	db *gorm.DB
}

func NewApplicationRepository(db *gorm.DB) ApplicationRepository {
	return &gormApplicationRepository{db: db}
}

func (r *gormApplicationRepository) FindByUserID(ctx context.Context, userID string) (*models.Application, error) {
	var app models.Application
	err := r.db.WithContext(ctx).First(&app, "user_id = ?", userID).Error
	if err != nil {
		return nil, err
	}
	return &app, nil
}

func (r *gormApplicationRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.Application, error) {
	var app models.Application
	err := r.db.WithContext(ctx).First(&app, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &app, nil
}

// Save fait un upsert complet (create si nouveau, save sinon) — le service
// appelant est responsable de charger l'existant avant modification pour ne
// pas écraser de champs.
func (r *gormApplicationRepository) Save(ctx context.Context, app *models.Application) error {
	return r.db.WithContext(ctx).Save(app).Error
}

func (r *gormApplicationRepository) List(ctx context.Context, p ListParams) ([]models.Application, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.Application{})
	if p.Status != "" {
		query = query.Where("status = ?", p.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var apps []models.Application
	err := query.
		Order("created_at DESC").
		Offset((p.Page - 1) * p.Limit).
		Limit(p.Limit).
		Find(&apps).Error
	if err != nil {
		return nil, 0, err
	}

	return apps, total, nil
}

func (r *gormApplicationRepository) CreateStatusEvent(ctx context.Context, event *models.StatusEvent) error {
	return r.db.WithContext(ctx).Create(event).Error
}
