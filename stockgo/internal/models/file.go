package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Visibility contrôle qui peut télécharger un fichier via GET /files/:id.
type Visibility string

const (
	VisibilityPublic  Visibility = "public"
	VisibilityPrivate Visibility = "private"
)

// File est l'enregistrement de métadonnées d'un fichier stocké. Le contenu
// binaire lui-même vit sur le disque (via le Storage), jamais en base —
// seuls le chemin et les métadonnées sont persistés ici.
type File struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	OriginalName   string         `gorm:"type:varchar(512);not null" json:"original_name"`
	StoredName     string         `gorm:"type:varchar(512);not null" json:"stored_name"`
	Extension      string         `gorm:"type:varchar(20);not null" json:"extension"`
	MimeType       string         `gorm:"type:varchar(255);not null;index" json:"mime_type"`
	Size           int64          `gorm:"not null" json:"size"`
	ChecksumSHA256 string         `gorm:"type:varchar(64);not null;index" json:"checksum_sha256"`
	Path           string         `gorm:"type:varchar(1024);not null" json:"path"`
	Bucket         string         `gorm:"type:varchar(100);not null;index" json:"bucket"`
	OwnerID        string         `gorm:"type:varchar(100);index" json:"owner_id"`
	Visibility     Visibility     `gorm:"type:varchar(20);not null;default:private;index" json:"visibility"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate génère un UUID v7 (ordonné dans le temps — meilleur pour les
// index B-tree que v4, contrairement à un UUID aléatoire) si absent.
func (f *File) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		f.ID = id
	}
	return nil
}

// TableName fixe explicitement le nom de table (évite toute ambiguïté de
// pluralisation GORM).
func (File) TableName() string {
	return "files"
}
