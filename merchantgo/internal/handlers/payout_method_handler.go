package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/middleware"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
)

type PayoutMethodHandler struct {
	service services.PayoutMethodService
	logger  *zap.Logger
}

func NewPayoutMethodHandler(service services.PayoutMethodService, logger *zap.Logger) *PayoutMethodHandler {
	return &PayoutMethodHandler{service: service, logger: logger}
}

// GetMine — GET /api/v1/merchant/payout-method
func (h *PayoutMethodHandler) GetMine(c *gin.Context) {
	userID := middleware.UserID(c)
	p, err := h.service.Get(c.Request.Context(), userID)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": p})
}

type setPayoutMethodRequest struct {
	Operator string `json:"operator" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
}

// SetMine — PUT /api/v1/merchant/payout-method
func (h *PayoutMethodHandler) SetMine(c *gin.Context) {
	var req setPayoutMethodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Requête invalide", err))
		return
	}
	userID := middleware.UserID(c)
	p, err := h.service.Set(c.Request.Context(), userID, services.PayoutMethodInput{Operator: req.Operator, Phone: req.Phone})
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": p})
}
