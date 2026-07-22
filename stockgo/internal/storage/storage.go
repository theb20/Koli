package storage

import (
	"context"
	"errors"
	"io"
	"time"
)

// ErrNotFound est retourné par Download/GetMetadata quand la clé n'existe
// pas dans le backend de stockage.
var ErrNotFound = errors.New("storage: fichier introuvable")

// Metadata décrit un objet stocké, indépendamment du backend physique.
type Metadata struct {
	Size       int64
	ModifiedAt time.Time
}

// Storage abstrait le moteur de stockage physique. L'implémentation du jour
// est locale (disque, via un Volume Railway) mais toute la couche métier
// (services, handlers) ne dépend que de cette interface — brancher S3,
// Backblaze B2, MinIO, Wasabi ou Cloudflare R2 plus tard ne demandera
// qu'une nouvelle implémentation de cette interface, aucun changement dans
// le reste du code.
type Storage interface {
	// Upload écrit le contenu de reader sous bucket/key, en streaming
	// (jamais chargé entièrement en mémoire). Retourne le nombre d'octets
	// écrits.
	Upload(ctx context.Context, bucket, key string, reader io.Reader) (int64, error)

	// Download retourne un flux de lecture sur le fichier — l'appelant est
	// responsable de fermer le ReadCloser.
	Download(ctx context.Context, bucket, key string) (io.ReadCloser, error)

	// Delete supprime le fichier. Ne retourne pas d'erreur si le fichier
	// est déjà absent (idempotent).
	Delete(ctx context.Context, bucket, key string) error

	// Exists indique si la clé existe dans le bucket.
	Exists(ctx context.Context, bucket, key string) (bool, error)

	// GetMetadata retourne les métadonnées physiques (taille, date de
	// modification) sans lire le contenu du fichier.
	GetMetadata(ctx context.Context, bucket, key string) (Metadata, error)
}
