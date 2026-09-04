package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/config"
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

type createWinipayerPaymentRequest struct {
	OrderID     string `json:"orderId" binding:"required"`
	OrderNumber string `json:"orderNumber" binding:"required"`
	Amount      int    `json:"amount" binding:"required"`
	Description string `json:"description" binding:"required"`
	ReturnURL   string `json:"returnUrl" binding:"required"`
	CancelURL   string `json:"cancelUrl" binding:"required"`
}

// CreateWinipayerPayment — POST /api/v1/internal/payments/winipayer/create,
// appelé serveur-à-serveur par backend/ (Node) à la création d'une commande
// en paiement en ligne — même protection X-API-Key que les autres routes
// /internal (voir middleware.RequireAdmin).
func (h *PaymentHandler) CreateWinipayerPayment(c *gin.Context) {
	var req createWinipayerPaymentRequest
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
