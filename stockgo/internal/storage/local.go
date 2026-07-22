package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// LocalStorage implémente Storage sur le système de fichiers local — en
// production, basePath pointe vers un Volume Railway monté, qui persiste
// entre les redéploiements du service.
type LocalStorage struct {
	basePath string
}

// NewLocalStorage crée le répertoire racine si nécessaire et retourne le
// backend de stockage local.
func NewLocalStorage(basePath string) (*LocalStorage, error) {
	abs, err := filepath.Abs(basePath)
	if err != nil {
		return nil, fmt.Errorf("résolution du chemin de stockage: %w", err)
	}
	if err := os.MkdirAll(abs, 0o750); err != nil {
		return nil, fmt.Errorf("création du répertoire de stockage: %w", err)
	}
	return &LocalStorage{basePath: abs}, nil
}

// resolvePath construit le chemin physique et vérifie qu'il reste bien
// contenu dans basePath — seconde barrière contre le path traversal, en
// plus de la validation faite en amont sur les clés générées par le service
// (jamais construites depuis une entrée utilisateur brute).
func (s *LocalStorage) resolvePath(bucket, key string) (string, error) {
	if strings.Contains(bucket, "..") || strings.ContainsAny(bucket, "/\\") {
		return "", fmt.Errorf("nom de bucket invalide: %q", bucket)
	}
	if strings.Contains(key, "..") {
		return "", fmt.Errorf("clé de fichier invalide: %q", key)
	}

	full := filepath.Join(s.basePath, bucket, filepath.Clean("/"+key))
	full = filepath.Clean(full)

	rel, err := filepath.Rel(s.basePath, full)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", errors.New("chemin résolu hors du répertoire de stockage (path traversal détecté)")
	}
	return full, nil
}

func (s *LocalStorage) Upload(_ context.Context, bucket, key string, reader io.Reader) (int64, error) {
	path, err := s.resolvePath(bucket, key)
	if err != nil {
		return 0, err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return 0, fmt.Errorf("création du répertoire cible: %w", err)
	}

	// Écriture dans un fichier temporaire puis rename atomique — évite
	// qu'un lecteur concurrent ne voie un fichier partiellement écrit si
	// l'upload est interrompu en cours de route.
	tmp, err := os.CreateTemp(filepath.Dir(path), ".upload-*")
	if err != nil {
		return 0, fmt.Errorf("création du fichier temporaire: %w", err)
	}
	tmpPath := tmp.Name()
	defer func() {
		tmp.Close()
		os.Remove(tmpPath) // no-op si le rename a déjà eu lieu
	}()

	written, err := io.Copy(tmp, reader)
	if err != nil {
		return 0, fmt.Errorf("écriture du fichier: %w", err)
	}
	if err := tmp.Sync(); err != nil {
		return 0, fmt.Errorf("synchronisation disque: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return 0, fmt.Errorf("fermeture du fichier temporaire: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return 0, fmt.Errorf("finalisation du fichier: %w", err)
	}

	return written, nil
}

func (s *LocalStorage) Download(_ context.Context, bucket, key string) (io.ReadCloser, error) {
	path, err := s.resolvePath(bucket, key)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("ouverture du fichier: %w", err)
	}
	return f, nil
}

func (s *LocalStorage) Delete(_ context.Context, bucket, key string) error {
	path, err := s.resolvePath(bucket, key)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("suppression du fichier: %w", err)
	}
	return nil
}

func (s *LocalStorage) Exists(_ context.Context, bucket, key string) (bool, error) {
	path, err := s.resolvePath(bucket, key)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func (s *LocalStorage) GetMetadata(_ context.Context, bucket, key string) (Metadata, error) {
	path, err := s.resolvePath(bucket, key)
	if err != nil {
		return Metadata{}, err
	}
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return Metadata{}, ErrNotFound
		}
		return Metadata{}, fmt.Errorf("lecture des métadonnées: %w", err)
	}
	return Metadata{Size: info.Size(), ModifiedAt: info.ModTime()}, nil
}
