package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"merchantgo/internal/middleware"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
)

type SubscriptionInvoiceHandler struct {
	service services.SubscriptionBillingService
	logger  *zap.Logger
}

func NewSubscriptionInvoiceHandler(service services.SubscriptionBillingService, logger *zap.Logger) *SubscriptionInvoiceHandler {
	return &SubscriptionInvoiceHandler{service: service, logger: logger}
}

// ListMine — GET /api/v1/merchant/subscription-invoices
func (h *SubscriptionInvoiceHandler) ListMine(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	userID := middleware.UserID(c)
	invoices, total, err := h.service.ListMine(c.Request.Context(), userID, page, limit)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"invoices": invoices, "total": total, "page": page, "limit": limit,
	}})
}

// AdminListByUser — GET /api/v1/admin/subscription-invoices/:userId —
// mêmes données que ListMine, mais pour N'IMPORTE QUEL marchand (réservé
// admin) : nécessaire pour retrouver l'id d'une facture avant de pouvoir
// appeler AdminMarkPaid dessus (dérogation manuelle).
func (h *SubscriptionInvoiceHandler) AdminListByUser(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	userID := c.Param("userId")
	invoices, total, err := h.service.ListMine(c.Request.Context(), userID, page, limit)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"invoices": invoices, "total": total, "page": page, "limit": limit,
	}})
}

// AdminMarkPaid — PUT /api/v1/admin/subscription-invoices/:id/mark-paid —
// dérogation manuelle (voir SubscriptionBillingService.AdminMarkPaid) :
// réactive automatiquement le marchand s'il était suspendu pour cette
// facture, sans attendre le prochain cycle.
func (h *SubscriptionInvoiceHandler) AdminMarkPaid(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("id invalide", err))
		return
	}
	inv, err := h.service.AdminMarkPaid(c.Request.Context(), id)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": inv})
}
