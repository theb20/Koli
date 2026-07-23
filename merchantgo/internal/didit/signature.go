// Package didit implémente la vérification des webhooks Didit
// (vérification d'identité) — signature HMAC-SHA256, canonicalisation JSON
// et décodage de l'enveloppe. Indépendant de Gin/GORM : les erreurs
// renvoyées sont des erreurs Go standard, à traduire en réponse HTTP par
// l'appelant.
package didit

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"
)

// CanonicalizeJSON reproduit l'algorithme de canonicalisation de Didit pour
// X-Signature-V2 : clés d'objet triées récursivement, nombres entiers sans
// décimale superflue (1.0 → 1), séparateurs compacts, unicode non échappé.
//
// Le round-trip Unmarshal→Marshal via interface{} suffit à obtenir ce
// résultat avec encoding/json : Go trie déjà les clés de map[string]any par
// ordre alphabétique à la sérialisation (à tous les niveaux d'imbrication),
// et représente un float64 entier sans partie décimale. Seul l'échappement
// HTML par défaut doit être désactivé pour préserver l'unicode tel quel.
func CanonicalizeJSON(raw []byte) ([]byte, error) {
	var v interface{}
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, fmt.Errorf("corps de requête JSON invalide: %w", err)
	}

	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, fmt.Errorf("canonicalisation JSON: %w", err)
	}
	// json.Encoder.Encode ajoute un saut de ligne final, absent de la
	// canonicalisation attendue par Didit.
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}

// ComputeSignatureV2 calcule HMAC-SHA256(secret, canonicalJSON) en
// hexadécimal — la valeur attendue dans l'en-tête X-Signature-V2.
func ComputeSignatureV2(secret string, canonicalJSON []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(canonicalJSON)
	return hex.EncodeToString(mac.Sum(nil))
}

var ErrTimestampOutOfRange = errors.New("didit: horodatage hors fenêtre autorisée")

// VerifyTimestamp rejette toute requête dont X-Timestamp s'écarte de plus
// de maxSkew de l'heure actuelle — fenêtre anti-rejeu recommandée par
// Didit (5 minutes).
func VerifyTimestamp(header string, now time.Time, maxSkew time.Duration) error {
	ts, err := strconv.ParseInt(header, 10, 64)
	if err != nil {
		return fmt.Errorf("en-tête X-Timestamp invalide: %w", err)
	}
	delta := now.Unix() - ts
	if delta < 0 {
		delta = -delta
	}
	if time.Duration(delta)*time.Second > maxSkew {
		return ErrTimestampOutOfRange
	}
	return nil
}
