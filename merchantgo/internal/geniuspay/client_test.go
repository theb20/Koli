package geniuspay

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func TestVerifyWebhookSignature(t *testing.T) {
	body := []byte(`{"event":"payment.completed","data":{"reference":"MTX-1"}}`)
	valid := sign("secret", body)

	if !VerifyWebhookSignature("secret", body, valid) {
		t.Fatal("signature valide rejetée")
	}
	if VerifyWebhookSignature("secret", body, sign("autre-secret", body)) {
		t.Fatal("signature calculée avec un autre secret acceptée")
	}
	if VerifyWebhookSignature("secret", []byte(`{"event":"payment.completed","data":{"reference":"MTX-2"}}`), valid) {
		t.Fatal("corps modifié mais signature de l'original acceptée (pas de détection d'altération)")
	}
	if VerifyWebhookSignature("secret", body, "") {
		t.Fatal("signature vide acceptée")
	}
	if VerifyWebhookSignature("", body, valid) {
		t.Fatal("secret vide accepté (webhook non configuré ne doit jamais faire foi)")
	}
}

func TestWebhookPayloadDecoding(t *testing.T) {
	var p WebhookPayload
	if err := json.Unmarshal([]byte(`{"event":"payment.completed","data":{"reference":"MTX-ABC123","amount":5000,"customer":{"name":"x"}}}`), &p); err != nil {
		t.Fatal(err)
	}
	if p.Event != "payment.completed" || p.Data.Reference != "MTX-ABC123" {
		t.Fatalf("décodage inattendu: %+v", p)
	}
}

func TestCreatePaymentSendsExpectedRequest(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/payments" {
			t.Fatalf("requête inattendue: %s %s", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("X-API-Key"); got != "key-1" {
			t.Fatalf("X-API-Key = %q", got)
		}
		if got := r.Header.Get("X-API-Secret"); got != "secret-1" {
			t.Fatalf("X-API-Secret = %q", got)
		}
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body["amount"] != float64(18000) || body["currency"] != "XOF" {
			t.Fatalf("corps inattendu: %+v", body)
		}
		if _, hasMethod := body["payment_method"]; hasMethod {
			t.Fatal("payment_method ne doit jamais être envoyé (mode checkout = choix par le client)")
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": map[string]any{"reference": "MTX-1", "checkout_url": "https://pay.genius.ci/checkout/MTX-1", "status": "pending"},
		})
	}))
	defer srv.Close()

	c := NewClient(Credentials{APIKey: "key-1", APISecret: "secret-1", BaseURL: srv.URL})
	result, err := c.CreatePayment(context.Background(), CreatePaymentInput{Amount: 18000, Description: "Commande KLI-1", SuccessURL: "https://x/ok", ErrorURL: "https://x/ko"})
	if err != nil {
		t.Fatal(err)
	}
	if result.Reference != "MTX-1" || result.CheckoutURL != "https://pay.genius.ci/checkout/MTX-1" {
		t.Fatalf("résultat inattendu: %+v", result)
	}
}

func TestCreatePaymentFallsBackToPaymentURL(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Réponse à la racine (pas d'enveloppe "data"), sans checkout_url — cas vu dans Resources/Payment.php
		_ = json.NewEncoder(w).Encode(map[string]any{"reference": "MTX-2", "payment_url": "https://pay.genius.ci/checkout/MTX-2"})
	}))
	defer srv.Close()

	c := NewClient(Credentials{APIKey: "k", APISecret: "s", BaseURL: srv.URL})
	result, err := c.CreatePayment(context.Background(), CreatePaymentInput{Amount: 1000})
	if err != nil {
		t.Fatal(err)
	}
	if result.CheckoutURL != "https://pay.genius.ci/checkout/MTX-2" {
		t.Fatalf("repli sur payment_url attendu, eu: %+v", result)
	}
}

func TestCreatePaymentErrorPropagatesMessage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_ = json.NewEncoder(w).Encode(map[string]any{"message": "Le champ amount est invalide", "errors": map[string][]string{"amount": {"invalide"}}})
	}))
	defer srv.Close()

	c := NewClient(Credentials{APIKey: "k", APISecret: "s", BaseURL: srv.URL})
	_, err := c.CreatePayment(context.Background(), CreatePaymentInput{Amount: -1})
	if err == nil {
		t.Fatal("erreur attendue")
	}
}

func TestCheckStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/payments/MTX-1" {
			t.Fatalf("requête inattendue: %s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"reference": "MTX-1", "status": "completed", "gateway_reference": "WAVE-9"}})
	}))
	defer srv.Close()

	c := NewClient(Credentials{APIKey: "k", APISecret: "s", BaseURL: srv.URL})
	d, err := c.CheckStatus(context.Background(), "MTX-1")
	if err != nil {
		t.Fatal(err)
	}
	if d.Status != "completed" || d.GatewayRef != "WAVE-9" {
		t.Fatalf("résultat inattendu: %+v", d)
	}
}

func TestDefaultBaseURLUsedWhenUnset(t *testing.T) {
	c := NewClient(Credentials{APIKey: "k", APISecret: "s"})
	if c.creds.BaseURL != DefaultBaseURL {
		t.Fatalf("BaseURL par défaut non appliqué: %q", c.creds.BaseURL)
	}
}
