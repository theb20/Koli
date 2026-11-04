package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"merchantgo/internal/middleware"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
)

type SettlementHandler struct {
	service services.SettlementService
	logger  *zap.Logger
}

func NewSettlementHandler(service services.SettlementService, logger *zap.Logger) *SettlementHandler {
	return &SettlementHandler{service: service, logger: logger}
}

// ListMine — GET /api/v1/merchant/settlements
func (h *SettlementHandler) ListMine(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	userID := middleware.UserID(c)
	settlements, total, err := h.service.ListMine(c.Request.Context(), userID, page, limit)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"settlements": settlements, "total": total, "page": page, "limit": limit,
	}})
}

type generateSettlementsRequest struct {
	// Premier jour du mois à clôturer, format "2006-01-02" — le backend
	// passe toujours le 1er du mois précédent. periodEnd est déduit comme
	// le 1er du mois SUIVANT ici, jamais transmis par l'appelant.
	PeriodStart string `json:"periodStart" binding:"required"`
}

// Generate — POST /api/v1/internal/settlements/generate — appelé par le
// cron mensuel de backend/ (jamais par un navigateur — même clé que les
// autres routes /internal, voir middleware.RequireAdmin). Idempotent : un
// rappel pour le même mois ne recrée jamais un relevé déjà généré.
func (h *SettlementHandler) Generate(c *gin.Context) {
	var req generateSettlementsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Requête invalide", err))
		return
	}
	periodStart, err := time.Parse("2006-01-02", req.PeriodStart)
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("periodStart invalide (attendu AAAA-MM-JJ)", err))
		return
	}
	periodStart = time.Date(periodStart.Year(), periodStart.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)

	settlements, err := h.service.GenerateForPeriod(c.Request.Context(), periodStart, periodEnd)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": settlements})
}

// MarkSent — POST /api/v1/internal/settlements/:id/mark-sent — appelé par
// backend/ juste après l'envoi effectif de l'email du relevé, pour tracer
// qu'il a bien été notifié (voir Status/SentAt).
func (h *SettlementHandler) MarkSent(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("id invalide", err))
		return
	}
	if err := h.service.MarkSent(c.Request.Context(), id); err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AdminRetryPayout — PUT /api/v1/admin/settlements/:id/retry-payout —
// dérogation manuelle pour un relevé au statut "failed", après vérification
// humaine côté dashboard GeniusPay qu'aucun double paiement n'est en jeu
// (voir doctrine dans services.SettlementService.AdminRetryPayout).
func (h *SettlementHandler) AdminRetryPayout(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("id invalide", err))
		return
	}
	settlement, err := h.service.AdminRetryPayout(c.Request.Context(), id)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": settlement})
}
