package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/config"
	"merchantgo/internal/geniuspay"
	"merchantgo/internal/middleware"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
	"merchantgo/internal/winipayer"
)

type PaymentHandler struct {
	service services.PaymentService
	cfg     *config.Config
	logger  *zap.Logger
}

func NewPaymentHandler(service services.PaymentService, cfg *config.Config, logger *zap.Logger) *PaymentHandler {
	return &PaymentHandler{service: service, cfg: cfg, logger: logger}
}

// createPaymentRequest — commun aux deux passerelles (seul le chemin
// diffère : /payments/geniuspay/create est la route active, voir routes.go ;
// /payments/winipayer/create n'est plus montée, WiniPayer ne crée plus de
// nouvelles transactions).
type createPaymentRequest struct {
	OrderID     string `json:"orderId" binding:"required"`
	OrderNumber string `json:"orderNumber" binding:"required"`
	Amount      int    `json:"amount" binding:"required"`
	Description string `json:"description" binding:"required"`
	ReturnURL   string `json:"returnUrl" binding:"required"`
	CancelURL   string `json:"cancelUrl" binding:"required"`
}

// CreateGeniusPayPayment — POST /api/v1/internal/payments/geniuspay/create,
// appelé serveur-à-serveur par backend/ (Node) à la création d'une commande
// en paiement en ligne — même protection X-API-Key que les autres routes
// /internal (voir middleware.RequireAdmin).
func (h *PaymentHandler) CreateGeniusPayPayment(c *gin.Context) {
	var req createPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Requête invalide", err))
		return
	}

	intent, err := h.service.CreatePayment(c.Request.Context(), services.CreatePaymentInput{
		OrderID:     req.OrderID,
		OrderNumber: req.OrderNumber,
		Amount:      req.Amount,
		Description: req.Description,
		ReturnURL:   req.ReturnURL,
		CancelURL:   req.CancelURL,
	})
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"checkoutUrl": intent.CheckoutURL,
		"providerRef": intent.ProviderRef,
	}})
}

// GeniusPayWebhook — POST /api/v1/webhooks/geniuspay. Authentifié par
// signature HMAC-SHA256 (jamais par JWT/clé de service — GeniusPay appelle
// cette route) : le STATUT réel est toujours revérifié auprès de GeniusPay
// via CheckStatus avant toute mutation (voir payment_service.ConfirmPayment)
// — jamais de confiance dans le seul corps du webhook, même signé (même
// doctrine que WiniPayer et le webhook Didit).
func (h *PaymentHandler) GeniusPayWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Lecture du corps de requête impossible", err))
		return
	}

	if h.cfg.GeniusPayWebhookSecret == "" {
		h.logger.Warn("webhook GeniusPay reçu mais secret non configuré")
		middleware.RespondError(c, h.logger, utils.ErrUnauthorized("Non configuré"))
		return
	}
	// La signature se vérifie sur le corps BRUT (avant tout décodage JSON) —
	// voir geniuspay.VerifyWebhookSignature.
	if !geniuspay.VerifyWebhookSignature(h.cfg.GeniusPayWebhookSecret, body, c.GetHeader("X-GeniusPay-Signature")) {
		h.logger.Warn("webhook GeniusPay rejeté — signature invalide")
		middleware.RespondError(c, h.logger, utils.ErrUnauthorized("Signature invalide"))
		return
	}

	var payload geniuspay.WebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Corps JSON invalide", err))
		return
	}
	if payload.Data.Reference == "" {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Référence de paiement absente", nil))
		return
	}

	if _, err := h.service.ConfirmPayment(c.Request.Context(), payload.Data.Reference); err != nil {
		// 5xx volontaire : GeniusPay retente automatiquement, ce qui absorbe
		// les pannes transitoires (backend/ momentanément indisponible...).
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// RefreshGeniusPayPayment — POST /api/v1/internal/payments/geniuspay/:providerRef/refresh
// Appelé par backend/ quand le client revient depuis GeniusPay (succès ou
// annulation confondus — voir orders.ts POST /:id/verify-payment) : ne
// déduit jamais le résultat de l'URL de retour, revérifie toujours
// directement auprès de GeniusPay via la même logique que le webhook
// (ConfirmPayment), ce qui déclenche aussi le rappel mark-paid/mark-cancelled
// sur backend/ si l'état est terminal.
func (h *PaymentHandler) RefreshGeniusPayPayment(c *gin.Context) {
	providerRef := c.Param("providerRef")
	if providerRef == "" {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("providerRef requis", nil))
		return
	}

	intent, err := h.service.ConfirmPayment(c.Request.Context(), providerRef)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"state":       intent.State,
		"operatorRef": intent.OperatorRef,
	}})
}

// winipayerWebhookPayload — champs documentés par WiniPayer pour le rappel
// de statut, nécessaires au calcul du hash de vérification (voir
// internal/winipayer.VerifyHash) : sha256(private_key + uuid + crypto +
// amount + created_at).
type winipayerWebhookPayload struct {
	UUID      string `json:"uuid"`
	Crypto    string `json:"crypto"`
	Amount    string `json:"amount"`
	CreatedAt string `json:"created_at"`
	Hash      string `json:"hash"`
}

// Webhook — POST /api/v1/webhooks/winipayer. Authentifié par hash (jamais
// par JWT/clé de service — WiniPayer appelle cette route). Le hash ne fait
// que prouver l'origine de l'appel : le STATUT réel est toujours revérifié
// auprès de WiniPayer via CheckStatus avant toute mutation (voir
// payment_service.ConfirmPayment) — jamais de confiance dans le seul corps
// du webhook, même signé (même doctrine que le webhook Didit).
func (h *PaymentHandler) Webhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Lecture du corps de requête impossible", err))
		return
	}

	var payload winipayerWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Corps JSON invalide", err))
		return
	}

	if !h.cfg.WinipayerConfigured() {
		h.logger.Warn("webhook WiniPayer reçu mais non configuré")
		middleware.RespondError(c, h.logger, utils.ErrUnauthorized("Non configuré"))
		return
	}
	_, _, privateKey := h.cfg.WinipayerCredentials()

	if !winipayer.VerifyHash(privateKey, payload.UUID, payload.Crypto, payload.Amount, payload.CreatedAt, payload.Hash) {
		h.logger.Warn("webhook WiniPayer rejeté — hash invalide", zap.String("uuid", payload.UUID))
		middleware.RespondError(c, h.logger, utils.ErrUnauthorized("Hash invalide"))
		return
	}

	if _, err := h.service.ConfirmPayment(c.Request.Context(), payload.UUID); err != nil {
		// 5xx volontaire : WiniPayer retente automatiquement, ce qui absorbe
		// les pannes transitoires (backend/ momentanément indisponible...).
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// RefreshWinipayerPayment — POST /api/v1/internal/payments/winipayer/:providerRef/refresh
// LEGACY : ne sert plus que les transactions WiniPayer déjà en attente au
// moment de la bascule vers GeniusPay (plus aucune n'est créée — voir
// CreateGeniusPayPayment). Appelé par backend/ quand le client revient depuis WiniPayer (succès ou
// annulation confondus — voir orders.ts POST /:id/verify-payment) : ne
// déduit jamais le résultat de l'URL de retour, revérifie toujours
// directement auprès de WiniPayer via la même logique que le webhook
// (ConfirmPayment), ce qui déclenche aussi le rappel mark-paid/mark-cancelled
// sur backend/ si l'état est terminal.
func (h *PaymentHandler) RefreshWinipayerPayment(c *gin.Context) {
	providerRef := c.Param("providerRef")
	if providerRef == "" {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("providerRef requis", nil))
		return
	}

	intent, err := h.service.ConfirmPayment(c.Request.Context(), providerRef)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"state":       intent.State,
		"operatorRef": intent.OperatorRef,
	}})
}
