package validation

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"

	"stockgo/internal/utils"
)

// allowedExtensions liste, par catégorie, les extensions acceptées à
// l'upload — whitelist stricte plutôt que blacklist : tout ce qui n'est pas
// explicitement listé est refusé.
var allowedExtensions = map[string]bool{
	// images
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true, ".svg": true,
	// vidéos
	".mp4": true, ".mov": true, ".avi": true, ".mkv": true, ".webm": true,
	// pdf
	".pdf": true,
	// documents
	".doc": true, ".docx": true, ".xls": true, ".xlsx": true, ".ppt": true, ".pptx": true, ".txt": true, ".csv": true,
	// archives
	".zip": true, ".rar": true, ".7z": true,
	// audio
	".mp3": true, ".wav": true, ".ogg": true, ".flac": true, ".m4a": true,
}

// allowedMimeTypes fait le pendant côté Content-Type déclaré — les deux
// checks (extension + MIME) doivent passer, l'un ne suffit pas seul (un
// fichier peut mentir sur son extension ou son Content-Type, mais rarement
// sur les deux de façon cohérente).
var allowedMimeTypes = map[string]bool{
	"image/jpeg": true, "image/png": true, "image/gif": true, "image/webp": true, "image/svg+xml": true,
	"video/mp4": true, "video/quicktime": true, "video/x-msvideo": true, "video/x-matroska": true, "video/webm": true,
	"application/pdf":    true,
	"application/msword": true, "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	"application/vnd.ms-excel": true, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
	"application/vnd.ms-powerpoint": true, "application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
	"text/plain": true, "text/csv": true,
	"application/zip": true, "application/x-rar-compressed": true, "application/x-7z-compressed": true,
	"audio/mpeg": true, "audio/wav": true, "audio/x-wav": true, "audio/ogg": true, "audio/flac": true, "audio/mp4": true, "audio/x-m4a": true,
}

var BucketNameRegex = regexp.MustCompile(`^[a-z0-9_-]{1,64}$`)

// ValidateExtension vérifie que l'extension du nom de fichier fourni est
// dans la whitelist et la retourne normalisée (minuscules).
func ValidateExtension(filename string) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		return "", utils.ErrBadRequest("Le fichier doit avoir une extension", nil)
	}
	if !allowedExtensions[ext] {
		return "", utils.ErrBadRequest(fmt.Sprintf("Extension non autorisée: %s", ext), nil)
	}
	return ext, nil
}

// ValidateMimeType vérifie que le type MIME déclaré est dans la whitelist.
func ValidateMimeType(mime string) error {
	// Content-Type peut inclure des paramètres (ex: "text/csv; charset=utf-8")
	base := strings.TrimSpace(strings.SplitN(mime, ";", 2)[0])
	if !allowedMimeTypes[base] {
		return utils.ErrBadRequest(fmt.Sprintf("Type de contenu non autorisé: %s", base), nil)
	}
	return nil
}

// ValidateSize vérifie que la taille annoncée ne dépasse pas la limite
// configurée — première barrière, avant même de commencer à lire le flux.
func ValidateSize(size, maxSize int64) error {
	if size <= 0 {
		return utils.ErrBadRequest("Fichier vide", nil)
	}
	if size > maxSize {
		return utils.ErrTooLarge(fmt.Sprintf("Fichier trop volumineux (max %d octets)", maxSize))
	}
	return nil
}

// ValidateBucket vérifie que le nom de bucket (dossier logique de
// destination, ex: "products", "avatars") est composé uniquement de
// caractères sûrs — refuse tout ce qui pourrait ressembler à un chemin
// (path traversal) avant même d'atteindre la couche de stockage.
func ValidateBucket(bucket string) error {
	if !BucketNameRegex.MatchString(bucket) {
		return utils.ErrBadRequest("Nom de bucket invalide (lettres minuscules, chiffres, - et _ uniquement)", nil)
	}
	return nil
}
