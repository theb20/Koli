package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"stockgo/internal/models"
	"stockgo/internal/repository"
	"stockgo/internal/storage"
	"stockgo/internal/utils"
	"stockgo/internal/validation"
)

const defaultBucket = "misc"

// UploadInput regroupe tout ce dont le service a besoin pour traiter un
// upload, indépendamment du framework HTTP (le handler Gin construit cette
// struct depuis la requête).
type UploadInput struct {
	Reader       io.Reader
	OriginalName string
	DeclaredSize int64
	MimeType     string
	Bucket       string
	OwnerID      string
	Visibility   models.Visibility
}

// ListResult porte la page de résultats et les métadonnées de pagination.
type ListResult struct {
	Files      []models.File
	Total      int64
	Page       int
	Limit      int
	TotalPages int
}

type FileService interface {
	Upload(ctx context.Context, in UploadInput) (*models.File, error)
	Download(ctx context.Context, id uuid.UUID) (io.ReadCloser, *models.File, error)
	GetInfo(ctx context.Context, id uuid.UUID) (*models.File, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, params repository.ListParams) (*ListResult, error)
}

type fileService struct {
	repo          repository.FileRepository
	storage       storage.Storage
	maxUploadSize int64
	publicURL     string
	logger        *zap.Logger
}

func NewFileService(repo repository.FileRepository, store storage.Storage, maxUploadSize int64, publicURL string, logger *zap.Logger) FileService {
	return &fileService{
		repo:          repo,
		storage:       store,
		maxUploadSize: maxUploadSize,
		publicURL:     publicURL,
		logger:        logger,
	}
}

func (s *fileService) Upload(ctx context.Context, in UploadInput) (*models.File, error) {
	ext, err := validation.ValidateExtension(in.OriginalName)
	if err != nil {
		return nil, err
	}
	if err := validation.ValidateMimeType(in.MimeType); err != nil {
		return nil, err
	}
	if err := validation.ValidateSize(in.DeclaredSize, s.maxUploadSize); err != nil {
		return nil, err
	}

	bucket := in.Bucket
	if bucket == "" {
		bucket = defaultBucket
	}
	if err := validation.ValidateBucket(bucket); err != nil {
		return nil, err
	}

	visibility := in.Visibility
	if visibility == "" {
		visibility = models.VisibilityPrivate
	}

	// Nom physique jamais dérivé du nom original — UUID + timestamp + ext,
	// comme demandé, pour ne jamais exposer ou faire confiance au nom
	// fourni par le client dans le chemin de stockage.
	storedName := fmt.Sprintf("%s-%d%s", uuid.New().String(), time.Now().UnixNano(), ext)

	// Le hash SHA256 est calculé en streaming pendant l'écriture (TeeReader)
	// — le fichier n'est jamais chargé entièrement en mémoire pour être
	// haché séparément.
	hasher := sha256.New()
	tee := io.TeeReader(in.Reader, hasher)

	written, err := s.storage.Upload(ctx, bucket, storedName, tee)
	if err != nil {
		return nil, utils.ErrInternal(fmt.Errorf("échec de l'écriture du fichier: %w", err))
	}

	checksum := hex.EncodeToString(hasher.Sum(nil))

	file := &models.File{
		OriginalName:   in.OriginalName,
		StoredName:     storedName,
		Extension:      ext,
		MimeType:       in.MimeType,
		Size:           written,
		ChecksumSHA256: checksum,
		Path:           bucket + "/" + storedName,
		Bucket:         bucket,
		OwnerID:        in.OwnerID,
		Visibility:     visibility,
	}

	if err := s.repo.Create(ctx, file); err != nil {
		// La ligne DB n'a pas pu être créée — on nettoie le fichier orphelin
		// plutôt que de laisser un objet stocké sans métadonnées associées.
		_ = s.storage.Delete(ctx, bucket, storedName)
		return nil, utils.ErrInternal(fmt.Errorf("échec de l'enregistrement des métadonnées: %w", err))
	}

	s.logger.Info("fichier uploadé",
		zap.String("id", file.ID.String()),
		zap.String("bucket", bucket),
		zap.Int64("size", written),
		zap.String("owner_id", in.OwnerID),
	)

	return file, nil
}

func (s *fileService) Download(ctx context.Context, id uuid.UUID) (io.ReadCloser, *models.File, error) {
	file, err := s.findOrNotFound(ctx, id)
	if err != nil {
		return nil, nil, err
	}

	reader, err := s.storage.Download(ctx, file.Bucket, file.StoredName)
	if err != nil {
		if err == storage.ErrNotFound {
			return nil, nil, utils.ErrNotFound("Fichier introuvable sur le disque (métadonnées orphelines)")
		}
		return nil, nil, utils.ErrInternal(err)
	}

	return reader, file, nil
}

func (s *fileService) GetInfo(ctx context.Context, id uuid.UUID) (*models.File, error) {
	return s.findOrNotFound(ctx, id)
}

func (s *fileService) Delete(ctx context.Context, id uuid.UUID) error {
	file, err := s.findOrNotFound(ctx, id)
	if err != nil {
		return err
	}

	if err := s.storage.Delete(ctx, file.Bucket, file.StoredName); err != nil {
		return utils.ErrInternal(fmt.Errorf("échec de la suppression physique: %w", err))
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return utils.ErrInternal(fmt.Errorf("échec de la suppression des métadonnées: %w", err))
	}

	s.logger.Info("fichier supprimé", zap.String("id", id.String()))
	return nil
}

func (s *fileService) List(ctx context.Context, params repository.ListParams) (*ListResult, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 100 {
		params.Limit = 20
	}

	files, total, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}

	totalPages := int(total) / params.Limit
	if int(total)%params.Limit != 0 {
		totalPages++
	}

	return &ListResult{
		Files:      files,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}

func (s *fileService) findOrNotFound(ctx context.Context, id uuid.UUID) (*models.File, error) {
	file, err := s.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, utils.ErrNotFound("Fichier introuvable")
		}
		return nil, utils.ErrInternal(err)
	}
	return file, nil
}
