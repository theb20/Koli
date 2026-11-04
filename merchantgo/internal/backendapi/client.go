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

func (c *Client) postJSON(ctx context.Context, path string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("backendapi: encodage requête: %w", err)
	}

	url := c.baseURL + path
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

// MarkOrderPaid appelle POST {backend}/api/internal/orders/:id/mark-paid,
// protégé côté backend par le middleware générique requireApiKey (déjà
// existant, réutilisé tel quel — voir backend/src/middleware/auth.ts).
func (c *Client) MarkOrderPaid(ctx context.Context, orderID, providerRef, operator string) error {
	path := fmt.Sprintf("/api/internal/orders/%s/mark-paid", orderID)
	return c.postJSON(ctx, path, map[string]string{
		"providerRef": providerRef,
		"operator":    operator,
	})
}

// MarkOrderCancelled appelle POST {backend}/api/internal/orders/:id/mark-cancelled
// — reason vaut "cancelled" (annulation volontaire) ou "failed" (paiement
// refusé/expiré), jamais deviné : reflète l'état réellement observé auprès
// de la passerelle (GeniusPay ou WiniPayer legacy, voir
// services/payment_service.go, ConfirmPayment).
func (c *Client) MarkOrderCancelled(ctx context.Context, orderID, providerRef, reason string) error {
	path := fmt.Sprintf("/api/internal/orders/%s/mark-cancelled", orderID)
	return c.postJSON(ctx, path, map[string]string{
		"providerRef": providerRef,
		"reason":      reason,
	})
}

// MarkOrderRefunded appelle POST {backend}/api/internal/orders/:id/mark-refunded
// — après confirmation d'un remboursement GeniusPay (webhook
// "payment.refunded", revérifié par payment_service.ConfirmRefund). Ne
// déclenche RIEN côté argent : GeniusPay n'expose aucune API de
// remboursement (voir geniuspay/client.go), le virement a déjà été fait
// manuellement par un humain sur son dashboard — cet appel ne fait que
// réconcilier l'état du retour associé côté backend.
func (c *Client) MarkOrderRefunded(ctx context.Context, orderID, providerRef string) error {
	path := fmt.Sprintf("/api/internal/orders/%s/mark-refunded", orderID)
	return c.postJSON(ctx, path, map[string]string{
		"providerRef": providerRef,
	})
}

// SendSubscriptionInvoiceEmail demande à backend/ (seul service avec un
// client email) de notifier un marchand qu'une facture d'abonnement est
// prête — merchantgo ne fait qu'orchestrer la facturation, jamais l'envoi.
func (c *Client) SendSubscriptionInvoiceEmail(ctx context.Context, userID string, amount int, checkoutURL string, dueAt time.Time, periodStart time.Time) error {
	path := fmt.Sprintf("/api/internal/merchants/%s/subscription-invoice", userID)
	return c.postJSON(ctx, path, map[string]any{
		"amount":      amount,
		"checkoutUrl": checkoutURL,
		"dueAt":       dueAt.Format(time.RFC3339),
		"periodStart": periodStart.Format("2006-01-02"),
	})
}

// SuspendMerchant suspend automatiquement le catalogue d'un marchand côté
// backend/ (SellerStore.suspendedAt) — appelé uniquement par
// subscription_billing_service.EscalateOverdue, jamais directement.
func (c *Client) SuspendMerchant(ctx context.Context, userID, reason, checkoutURL string) error {
	path := fmt.Sprintf("/api/internal/merchants/%s/suspend", userID)
	body := map[string]any{"reason": reason}
	if checkoutURL != "" {
		body["checkoutUrl"] = checkoutURL
	}
	return c.postJSON(ctx, path, body)
}

// UnsuspendMerchant réactive automatiquement un marchand suspendu pour
// impayé — appelé uniquement au paiement confirmé d'une facture qui
// l'avait suspendu (voir ConfirmPayment).
func (c *Client) UnsuspendMerchant(ctx context.Context, userID string) error {
	path := fmt.Sprintf("/api/internal/merchants/%s/unsuspend", userID)
	return c.postJSON(ctx, path, map[string]any{})
}
