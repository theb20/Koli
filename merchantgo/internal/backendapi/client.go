// Package backendapi implémente les appels sortants merchantgo → backend/
// (Node) — sens inverse de l'appel existant backend → merchantgo (voir
// backend/src/lib/merchantgo.ts). Utilisé uniquement pour signaler qu'une
// commande vient d'être payée en ligne, afin que backend/ (propriétaire de
// l'agrégat Order) déclenche ses propres effets de bord déjà corrects
// (notifyMerchantsOrderPaid : crédit du wallet marchand + notifications) —
// cette logique n'est PAS dupliquée ici.
package backendapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	baseURL string
	secret  string
	http    *http.Client
}

func NewClient(baseURL, secret string) *Client {
	return &Client{baseURL: baseURL, secret: secret, http: &http.Client{Timeout: 15 * time.Second}}
}

// Configured indique si l'URL et le secret backend sont renseignés — permet
// de dégrader proprement (log + statut local seul) plutôt que d'échouer
// silencieusement si la configuration est incomplète en environnement de dev.
func (c *Client) Configured() bool {
	return c.baseURL != "" && c.secret != ""
}

// MarkOrderPaid appelle POST {backend}/api/internal/orders/:id/mark-paid,
// protégé côté backend par le middleware générique requireApiKey (déjà
// existant, réutilisé tel quel — voir backend/src/middleware/auth.ts).
func (c *Client) MarkOrderPaid(ctx context.Context, orderID, providerRef, operator string) error {
	body, err := json.Marshal(map[string]string{
		"providerRef": providerRef,
		"operator":    operator,
	})
	if err != nil {
		return fmt.Errorf("backendapi: encodage requête: %w", err)
	}

	url := fmt.Sprintf("%s/api/internal/orders/%s/mark-paid", c.baseURL, orderID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("backendapi: construction requête: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.secret)

	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("backendapi: appel backend: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode >= 300 {
		return fmt.Errorf("backendapi: réponse backend inattendue (HTTP %d)", res.StatusCode)
	}
	return nil
}
