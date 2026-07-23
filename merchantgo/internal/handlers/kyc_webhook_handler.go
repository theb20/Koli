package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/config"
	"merchantgo/internal/didit"
	"merchantgo/internal/middleware"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
)

// diditTimestampSkew borne la fenêtre anti-rejeu recommandée par Didit.
const diditTimestampSkew = 5 * time.Minute

var (
	errWebhookMisconfigured = errors.New("DIDIT_WEBHOOK_SECRET non configuré")
	errMissingSignature     = errors.New("en-tête X-Signature-V2 manquant")
	errSignatureMismatch    = errors.New("signature invalide")
)

type KycWebhookHandler struct {
	service services.KycService
	cfg     *config.Config
	logger  *zap.Logger
}

func NewKycWebhookHandler(service services.KycService, cfg *config.Config, logger *zap.Logger) *KycWebhookHandler {
	return &KycWebhookHandler{service: service, cfg: cfg, logger: logger}
}

// Receive godoc
// @Summary Webhook Didit (vérification d'identité)
// @Router /api/v1/webhooks/didit [post]
//
// Authentifié par signature HMAC (X-Signature-V2), pas par JWT ni clé de
// service — n'importe qui peut appeler cette route, seule une signature
// valide fait foi. Le corps est lu en octets bruts AVANT tout parsing JSON :
// la canonicalisation qui sert à vérifier la signature part de ces octets
// exacts, jamais d'une resérialisation par le binding Gin qui pourrait
// diverger (ordre des champs, espaces...).
func (h *KycWebhookHandler) Receive(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Lecture du corps de requête impossible", err))
		return
	}

	if err := h.verify(c, body); err != nil {
		// Corps brut logué uniquement sur échec de signature — sert au
		// diagnostic (config manquante, secret désynchronisé, horodatage
		// hors fenêtre...), jamais sur une requête valide.
		h.logger.Warn("webhook Didit rejeté", zap.Error(err), zap.ByteString("body", body))
		middleware.RespondError(c, h.logger, utils.ErrUnauthorized("Signature invalide"))
		return
	}

	var payload didit.WebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Corps JSON invalide", err))
		return
	}

	// Le traitement (une poignée de requêtes DB) tient largement dans le
	// budget de 5s imposé par Didit — pas besoin de file d'attente
	// asynchrone pour ce volume. Une erreur ici renvoie volontairement un
	// 5xx : Didit retente automatiquement (jusqu'à 2 fois), ce qui absorbe
	// les pannes transitoires (DB temporairement indisponible...) sans
	// logique de retry à réécrire ici.
	if err := h.service.ProcessWebhook(c.Request.Context(), payload, body); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrInternal(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *KycWebhookHandler) verify(c *gin.Context, body []byte) error {
	if h.cfg.DiditWebhookSecret == "" {
		return errWebhookMisconfigured
	}

	if err := didit.VerifyTimestamp(c.GetHeader("X-Timestamp"), time.Now(), diditTimestampSkew); err != nil {
		return err
	}

	signature := c.GetHeader("X-Signature-V2")
	if signature == "" {
		return errMissingSignature
	}

	canonical, err := didit.CanonicalizeJSON(body)
	if err != nil {
		return err
	}
	expected := didit.ComputeSignatureV2(h.cfg.DiditWebhookSecret, canonical)

	if subtle.ConstantTimeCompare([]byte(expected), []byte(signature)) != 1 {
		return errSignatureMismatch
	}
	return nil
}
