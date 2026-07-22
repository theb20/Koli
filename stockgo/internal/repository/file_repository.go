package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"stockgo/internal/models"
)

// ListParams regroupe pagination, recherche, tri et filtres pour GET /files.
type ListParams struct {
	Page     int
	Limit    int
	Search   string
	SortBy   string // created_at | size | original_name
	SortDir  string // asc | desc
	MimeType string
	Bucket   string
}

var sortableColumns = map[string]bool{
	"created_at":    true,
	"size":          true,
	"original_name": true,
}

// FileRepository abstrait l'accès aux métadonnées de fichiers — permet de
// tester le service sans base réelle, et isole GORM du reste du code.
type FileRepository interface {
	Create(ctx context.Context, file *models.File) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.File, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, params ListParams) ([]models.File, int64, error)
}

type gormFileRepository struct {
	db *gorm.DB
}

func NewFileRepository(db *gorm.DB) FileRepository {
	return &gormFileRepository{db: db}
}

func (r *gormFileRepository) Create(ctx context.Context, file *models.File) error {
	return r.db.WithContext(ctx).Create(file).Error
}

func (r *gormFileRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.File, error) {
	var file models.File
	err := r.db.WithContext(ctx).First(&file, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

// Delete effectue un soft delete (DeletedAt) — l'enregistrement reste en
// base pour l'audit, mais n'apparaît plus dans les listings ni les lookups.
func (r *gormFileRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.File{}, "id = ?", id).Error
}

func (r *gormFileRepository) List(ctx context.Context, p ListParams) ([]models.File, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.File{})

	if p.Search != "" {
		query = query.Where("original_name ILIKE ?", "%"+p.Search+"%")
	}
	if p.MimeType != "" {
		query = query.Where("mime_type = ?", p.MimeType)
	}
	if p.Bucket != "" {
		query = query.Where("bucket = ?", p.Bucket)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy := "created_at"
	if sortableColumns[p.SortBy] {
		sortBy = p.SortBy
	}
	sortDir := "DESC"
	if p.SortDir == "asc" {
		sortDir = "ASC"
	}

	var files []models.File
	err := query.
		Order(fmt.Sprintf("%s %s", sortBy, sortDir)).
		Offset((p.Page - 1) * p.Limit).
		Limit(p.Limit).
		Find(&files).Error
	if err != nil {
		return nil, 0, err
	}

	return files, total, nil
}
