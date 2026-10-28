// Package geniuspay implémente l'intégration avec la passerelle de paiement
// GeniusPay (Wave, Orange Money, MTN Money, carte) — création de lien de
// paiement hébergé, revérification du statut réel d'une transaction, et
// validation de signature des webhooks. Indépendant de Gin/GORM, comme
// internal/winipayer et internal/didit : erreurs Go standard, traduites en
// réponse HTTP par l'appelant (voir handlers/payment_handler.go).
//
// Constantes de forme d'API établies en lisant le SDK officiel
// (github.com/Genius-Groupsgit/geniuspay-laravel, GeniusPayClient.php,
// Resources/Payment.php, Http/Controllers/WebhookController.php) — aucune
// documentation HTTP brute publique n'étant accessible (pay.genius.ci/doc
// est une page rendue en JavaScript). L'URL de base y est trouvée à deux
// valeurs différentes (une dans le code, une dans la config par défaut) ;
// celle retenue ici (pay.genius.ci) est celle du tableau de bord marchand
// et de l'outil de test officiel fournis avec le SDK — à CONFIRMER en
// sandbox avec de vraies clés avant mise en production (voir
// GeniusPayBaseURL, overridable sans redéploiement de code).
package geniuspay

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const (
	// DefaultBaseURL — voir le commentaire de package : la seule valeur
	// corroborée par plusieurs sources officielles (dashboard, placeholder
	// de l'outil de test). Overridable via Config.GeniusPayBaseURL.
	DefaultBaseURL = "https://pay.genius.ci/api/v1/merchant"
	httpTimeout    = 15 * time.Second
)

// Credentials — jeu de clés d'un environnement (sandbox OU live), jamais
// mélangées entre les deux (même doctrine que winipayer.Credentials).
type Credentials struct {
	APIKey    string
	APISecret string
	BaseURL   string // DefaultBaseURL si vide
}

type Client struct {
	creds Credentials
	http  *http.Client
}

func NewClient(creds Credentials) *Client {
	if creds.BaseURL == "" {
		creds.BaseURL = DefaultBaseURL
	}
	return &Client{creds: creds, http: &http.Client{Timeout: httpTimeout}}
}

type CreatePaymentInput struct {
	Amount      int // FCFA, unité entière
	Currency    string
	Description string
	SuccessURL  string
	ErrorURL    string
	Customer    map[string]string // name, email, phone (tous optionnels)
	Metadata    map[string]any
}

type CreatePaymentResult struct {
	Reference   string
	CheckoutURL string
	ExpiresAt   string
}

// apiErrorBody — forme d'erreur du SDK officiel (handleResponse) : un champ
// "message", et "errors" uniquement en 422 (validation).
type apiErrorBody struct {
	Message string              `json:"message"`
	Errors  map[string][]string `json:"errors"`
}

// paymentBody suit les champs exposés par Resources/Payment.php du SDK
// officiel — reference est notre ProviderRef (ex. "MTX-ABC123"),
// checkout_url (repli sur payment_url si absent, même logique que le SDK).
type paymentBody struct {
	Reference   string `json:"reference"`
	Status      string `json:"status"` // pending | processing | completed | failed | cancelled | expired
	PaymentURL  string `json:"payment_url"`
	CheckoutURL string `json:"checkout_url"`
	ExpiresAt   string `json:"expires_at"`
	Gateway     string `json:"gateway"` // ex: "wave", "orange_money", "mtn_money", "card"
	GatewayRef  string `json:"gateway_reference"`
}

// envelope — la racine de la réponse peut être soit l'objet paiement
// directement, soit {"data": {...}} (le SDK gère les deux : `$response['data']
// ?? $response`) ; on tente data, puis on retombe sur la racine.
type envelope struct {
	Data *paymentBody `json:"data"`
	paymentBody
}

func (c *Client) doRequest(ctx context.Context, method, path string, body any, out *paymentBody) error {
	var reader *bytes.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("geniuspay: encodage requête: %w", err)
		}
		reader = bytes.NewReader(b)
	} else {
		reader = bytes.NewReader(nil)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.creds.BaseURL+path, reader)
	if err != nil {
		return fmt.Errorf("geniuspay: construction requête: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-API-Key", c.creds.APIKey)
	req.Header.Set("X-API-Secret", c.creds.APISecret)

	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("geniuspay: appel API: %w", err)
	}
	defer res.Body.Close()

	raw, err := decodeBody(res)
	if err != nil {
		return fmt.Errorf("geniuspay: réponse illisible (HTTP %d): %w", res.StatusCode, err)
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		var apiErr apiErrorBody
		_ = json.Unmarshal(raw, &apiErr)
		if apiErr.Message != "" {
			return fmt.Errorf("geniuspay: %s (HTTP %d)", apiErr.Message, res.StatusCode)
		}
		return fmt.Errorf("geniuspay: échec de la requête (HTTP %d)", res.StatusCode)
	}

	if out != nil {
		var env envelope
		if err := json.Unmarshal(raw, &env); err != nil {
			return fmt.Errorf("geniuspay: décodage résultat: %w", err)
		}
		if env.Data != nil {
			*out = *env.Data
		} else {
			*out = env.paymentBody
		}
	}
	return nil
}

func decodeBody(res *http.Response) ([]byte, error) {
	buf := new(bytes.Buffer)
	if _, err := buf.ReadFrom(res.Body); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// CreatePayment crée un paiement hébergé GeniusPay — le client final y est
// redirigé pour choisir Wave/Orange Money/MTN/carte et payer. Pas de
// payment_method transmis : déclenche le mode checkout (sélection par le
// client), comme le fait le SDK officiel (`unset($data['payment_method'])`
// dans sa méthode `checkout()`).
func (c *Client) CreatePayment(ctx context.Context, in CreatePaymentInput) (*CreatePaymentResult, error) {
	currency := in.Currency
	if currency == "" {
		currency = "XOF"
	}
	body := map[string]any{
		"amount":      in.Amount,
		"currency":    currency,
		"description": in.Description,
		"success_url": in.SuccessURL,
		"error_url":   in.ErrorURL,
	}
	if len(in.Customer) > 0 {
		body["customer"] = in.Customer
	}
	if in.Metadata != nil {
		body["metadata"] = in.Metadata
	}

	var result paymentBody
	if err := c.doRequest(ctx, http.MethodPost, "/payments", body, &result); err != nil {
		return nil, err
	}
	checkout := result.CheckoutURL
	if checkout == "" {
		checkout = result.PaymentURL
	}
	return &CreatePaymentResult{Reference: result.Reference, CheckoutURL: checkout, ExpiresAt: result.ExpiresAt}, nil
}

// PaymentDetail — statut réel d'une transaction, tel que revérifié auprès de
// GeniusPay avec nos propres clés (jamais de confiance dans le seul contenu
// du webhook, même signé — doctrine déjà appliquée à WiniPayer/PayDunya).
type PaymentDetail struct {
	Reference  string
	Status     string // pending | processing | completed | failed | cancelled | expired
	Gateway    string
	GatewayRef string
}

// CheckStatus interroge GET /payments/:reference — à appeler à chaque
// réception de webhook ET disponible pour un contrôle manuel (page de
// retour client, ou test local sans webhook joignable).
func (c *Client) CheckStatus(ctx context.Context, reference string) (*PaymentDetail, error) {
	var result paymentBody
	if err := c.doRequest(ctx, http.MethodGet, "/payments/"+reference, nil, &result); err != nil {
		return nil, err
	}
	return &PaymentDetail{Reference: result.Reference, Status: result.Status, Gateway: result.Gateway, GatewayRef: result.GatewayRef}, nil
}

// VerifyWebhookSignature reproduit la vérification du SDK officiel
// (WebhookController::verifySignature) : HMAC-SHA256(secret, corps BRUT de
// la requête, hex) comparé en temps constant à l'en-tête
// X-GeniusPay-Signature. `body` doit être le corps exact tel que reçu, lu
// AVANT tout décodage JSON (comme pour toute vérification HMAC).
func VerifyWebhookSignature(secret string, body []byte, receivedSignature string) bool {
	if secret == "" || receivedSignature == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(receivedSignature))
}

// WebhookPayload — forme documentée par le SDK officiel
// (WebhookController::handle) : {event, data: {reference, ...}}. Seul
// `data.reference` nous intéresse — le STATUT n'est jamais pris dans le
// webhook, toujours revérifié via CheckStatus (voir doctrine ci-dessus).
type WebhookPayload struct {
	Event string `json:"event"`
	Data  struct {
		Reference string `json:"reference"`
	} `json:"data"`
}
