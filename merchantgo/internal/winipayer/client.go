// Package winipayer implémente l'intégration avec la passerelle de paiement
// WiniPayer (checkout standard) — création de lien de paiement, revérification
// du statut réel d'une transaction, et validation de signature des webhooks.
// Indépendant de Gin/GORM, comme internal/didit : erreurs Go standard,
// traduites en réponse HTTP par l'appelant (voir handlers/payment_handler.go).
package winipayer

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const (
	baseURL    = "https://api-v2.winipayer.com"
	httpTimeout = 15 * time.Second
)

// Credentials — jeu de clés d'un environnement (test OU prod), jamais
// mélangées entre les deux (voir config.Config.WinipayerCredentials).
type Credentials struct {
	MerchantApply string
	MerchantToken string
	PrivateKey    string
	Env           string // "test" | "prod" — transmis tel quel dans le champ `env` des requêtes
}

type Client struct {
	creds Credentials
	http  *http.Client
}

func NewClient(creds Credentials) *Client {
	return &Client{creds: creds, http: &http.Client{Timeout: httpTimeout}}
}

type CreatePaymentInput struct {
	Amount      int    // FCFA, unité entière — WiniPayer n'a pas de sous-unité pour XOF
	Description string
	ReturnURL   string
	CancelURL   string
	CallbackURL string
	CustomData  map[string]any
}

type CreatePaymentResult struct {
	UUID        string
	CheckoutURL string
	ExpiredAt   string
}

type apiError struct {
	Code int    `json:"code"`
	Key  string `json:"key"`
	Msg  string `json:"msg"`
}

// createResponse suit exactement le schéma documenté par WiniPayer (voir
// docs.winipayer.com/app/2.0-fr/checkout/standard) — "results" est un objet
// en cas de succès, un tableau vide en cas d'échec, d'où `json.RawMessage`
// pour ne décoder qu'après avoir vérifié `success`. "errors" a la même
// incohérence dans l'autre sens : tableau vide `[]` en cas de succès, objet
// `{code,key,msg}` en cas d'échec — même traitement en RawMessage, décodé
// uniquement dans la branche d'échec (voir doRequest).
type apiEnvelope struct {
	Success  bool            `json:"success"`
	Results  json.RawMessage `json:"results"`
	Errors   json.RawMessage `json:"errors"`
	Messages []string        `json:"messages"`
}

func (c *Client) doRequest(ctx context.Context, method, path string, body any, out any) error {
	var reader *bytes.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("winipayer: encodage requête: %w", err)
		}
		reader = bytes.NewReader(b)
	} else {
		reader = bytes.NewReader(nil)
	}

	req, err := http.NewRequestWithContext(ctx, method, baseURL+path, reader)
	if err != nil {
		return fmt.Errorf("winipayer: construction requête: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Merchant-Apply", c.creds.MerchantApply)
	req.Header.Set("X-Merchant-Token", c.creds.MerchantToken)

	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("winipayer: appel API: %w", err)
	}
	defer res.Body.Close()

	var envelope apiEnvelope
	if err := json.NewDecoder(res.Body).Decode(&envelope); err != nil {
		return fmt.Errorf("winipayer: réponse illisible (HTTP %d): %w", res.StatusCode, err)
	}
	if !envelope.Success {
		var apiErr apiError
		if err := json.Unmarshal(envelope.Errors, &apiErr); err == nil && apiErr.Msg != "" {
			return fmt.Errorf("winipayer: %s (%s)", apiErr.Msg, apiErr.Key)
		}
		return fmt.Errorf("winipayer: échec de la requête (HTTP %d)", res.StatusCode)
	}
	if out != nil {
		if err := json.Unmarshal(envelope.Results, out); err != nil {
			return fmt.Errorf("winipayer: décodage résultat: %w", err)
		}
	}
	return nil
}

// CreatePayment crée un lien de paiement hébergé WiniPayer — le client final
// y est redirigé pour choisir Wave/Orange Money/MTN/carte et payer.
func (c *Client) CreatePayment(ctx context.Context, in CreatePaymentInput) (*CreatePaymentResult, error) {
	body := map[string]any{
		"env":          c.creds.Env,
		"amount":       in.Amount,
		"description":  in.Description,
		"return_url":   in.ReturnURL,
		"cancel_url":   in.CancelURL,
		"callback_url": in.CallbackURL,
	}
	if in.CustomData != nil {
		// L'API WiniPayer exige custom_data en chaîne de caractères, pas en
		// objet JSON imbriqué (rejeté avec "The custom data field must be a
		// string.") — on l'encode nous-mêmes, WiniPayer nous la renverra
		// telle quelle (même chaîne) dans le détail de la transaction.
		encoded, err := json.Marshal(in.CustomData)
		if err != nil {
			return nil, fmt.Errorf("winipayer: encodage custom_data: %w", err)
		}
		body["custom_data"] = string(encoded)
	}

	var result struct {
		UUID      string `json:"uuid"`
		Checkout  string `json:"checkout_process"`
		ExpiredAt string `json:"expired_at"`
	}
	if err := c.doRequest(ctx, http.MethodPost, "/checkout/standard/create", body, &result); err != nil {
		return nil, err
	}
	return &CreatePaymentResult{UUID: result.UUID, CheckoutURL: result.Checkout, ExpiredAt: result.ExpiredAt}, nil
}

// InvoiceDetail — statut réel d'une transaction, tel que revérifié auprès de
// WiniPayer avec nos propres clés (jamais de confiance dans le seul contenu
// du webhook, même signé — doctrine déjà appliquée à PayDunya côté backend/).
type InvoiceDetail struct {
	UUID        string `json:"uuid"`
	State       string `json:"state"` // success | pending | failed | cancelled
	Amount      int    `json:"amount"`
	Currency    string `json:"currency"`
	Operator    string `json:"operator"`
	OperatorRef string `json:"operator_ref"`
	Hash        string `json:"hash"`
	CreatedAt   string `json:"created_at"`
}

// CheckStatus interroge /checkout/standard/detail/:uuid — à appeler à chaque
// réception de webhook ET disponible pour un contrôle manuel (page de retour
// client, ou test local sans webhook joignable).
func (c *Client) CheckStatus(ctx context.Context, uuid string) (*InvoiceDetail, error) {
	body := map[string]any{"env": c.creds.Env}

	var result struct {
		Invoice InvoiceDetail `json:"invoice"`
	}
	if err := c.doRequest(ctx, http.MethodPost, "/checkout/standard/detail/"+uuid, body, &result); err != nil {
		return nil, err
	}
	return &result.Invoice, nil
}

// VerifyHash reproduit la vérification documentée par WiniPayer :
// sha256(private_key + uuid + crypto + amount + created_at). `crypto` est la
// référence temporaire renvoyée à la création (distincte de `uuid`, qui est
// permanente) — nécessaire uniquement pour ce calcul, jamais stockée.
func VerifyHash(privateKey, uuid, crypto, amount, createdAt, receivedHash string) bool {
	sum := sha256.Sum256([]byte(privateKey + uuid + crypto + amount + createdAt))
	expected := hex.EncodeToString(sum[:])
	return expected == receivedHash
}
