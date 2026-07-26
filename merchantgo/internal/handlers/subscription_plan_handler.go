package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/middleware"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
)

type SubscriptionPlanHandler struct {
	service services.SubscriptionPlanService
	logger  *zap.Logger
}

func NewSubscriptionPlanHandler(service services.SubscriptionPlanService, logger *zap.Logger) *SubscriptionPlanHandler {
	return &SubscriptionPlanHandler{service: service, logger: logger}
}

// List — GET /api/v1/subscription-plans (public — activeOnly=true) et
// GET /api/v1/admin/subscription-plans (admin — tous les plans, y compris inactifs).
func (h *SubscriptionPlanHandler) List(c *gin.Context) {
	activeOnly := c.Query("all") != "true"
	plans, err := h.service.List(c.Request.Context(), activeOnly)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": plans})
}

type planRequest struct {
	Slug           string  `json:"slug" binding:"required"`
	Name           string  `json:"name" binding:"required"`
	MaxProducts    int     `json:"maxProducts"`
	MaxEmployees   int     `json:"maxEmployees"`
	MaxOrders      int     `json:"maxOrders"`
	StorageLimitMb int     `json:"storageLimitMb"`
	CommissionRate float64 `json:"commissionRate"`
	PriceMonthly   int     `json:"priceMonthly"`
	PriceYearly    int     `json:"priceYearly"`
	Features       string  `json:"features"`
	IsActive       bool    `json:"isActive"`
	Position       int     `json:"position"`
}

func (r planRequest) toInput() services.SubscriptionPlanInput {
	return services.SubscriptionPlanInput{
		Slug: r.Slug, Name: r.Name,
		MaxProducts: r.MaxProducts, MaxEmployees: r.MaxEmployees, MaxOrders: r.MaxOrders,
		StorageLimitMb: r.StorageLimitMb, CommissionRate: r.CommissionRate,
		PriceMonthly: r.PriceMonthly, PriceYearly: r.PriceYearly,
		Features: r.Features, IsActive: r.IsActive, Position: r.Position,
	}
}

// Create — POST /api/v1/admin/subscription-plans
func (h *SubscriptionPlanHandler) Create(c *gin.Context) {
	var req planRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Requête invalide", err))
		return
	}
	p, err := h.service.Create(c.Request.Context(), req.toInput())
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": p})
}

// Update — PUT /api/v1/admin/subscription-plans/:id
func (h *SubscriptionPlanHandler) Update(c *gin.Context) {
	id, err := parseUUID(c.Param("id"))
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Identifiant invalide", err))
		return
	}
	var req planRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Requête invalide", err))
		return
	}
	p, err := h.service.Update(c.Request.Context(), id, req.toInput())
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": p})
}

// Delete — DELETE /api/v1/admin/subscription-plans/:id
func (h *SubscriptionPlanHandler) Delete(c *gin.Context) {
	id, err := parseUUID(c.Param("id"))
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Identifiant invalide", err))
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
