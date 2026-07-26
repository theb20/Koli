package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"merchantgo/internal/config"
	"merchantgo/internal/middleware"
	"merchantgo/internal/models"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
)

type BillingHandler struct {
	service services.BillingService
	cfg     *config.Config
	logger  *zap.Logger
}

func NewBillingHandler(service services.BillingService, cfg *config.Config, logger *zap.Logger) *BillingHandler {
	return &BillingHandler{service: service, cfg: cfg, logger: logger}
}

// GetMine — GET /api/v1/merchant/billing
func (h *BillingHandler) GetMine(c *gin.Context) {
	userID := middleware.UserID(c)
	b, err := h.service.Get(c.Request.Context(), userID)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": b})
}

type chooseBillingRequest struct {
	Mode               string   `json:"mode" binding:"required,oneof=commission subscription"`
	CommissionRate     *float64 `json:"commissionRate"`
	SubscriptionPlanID *string  `json:"subscriptionPlanId"`
}

// Choose — PUT /api/v1/merchant/billing
func (h *BillingHandler) Choose(c *gin.Context) {
	var req chooseBillingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Requête invalide", err))
		return
	}

	in := services.BillingChoiceInput{
		Mode:           models.BillingMode(req.Mode),
		CommissionRate: req.CommissionRate,
	}
	if req.SubscriptionPlanID != nil {
		id, err := uuid.Parse(*req.SubscriptionPlanID)
		if err != nil {
			middleware.RespondError(c, h.logger, utils.ErrBadRequest("subscriptionPlanId invalide", err))
			return
		}
		in.SubscriptionPlanID = &id
	}

	userID := middleware.UserID(c)
	b, err := h.service.Choose(c.Request.Context(), userID, in, h.cfg.BillingLockDays)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": b})
}
