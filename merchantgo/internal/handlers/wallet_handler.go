package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/middleware"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
)

type WalletHandler struct {
	service services.WalletService
	logger  *zap.Logger
}

func NewWalletHandler(service services.WalletService, logger *zap.Logger) *WalletHandler {
	return &WalletHandler{service: service, logger: logger}
}

// Balance — GET /api/v1/merchant/wallet/balance
func (h *WalletHandler) Balance(c *gin.Context) {
	userID := middleware.UserID(c)
	balance, err := h.service.Balance(c.Request.Context(), userID)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"balance": balance}})
}

// ListTransactions — GET /api/v1/merchant/wallet/transactions
func (h *WalletHandler) ListTransactions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	userID := middleware.UserID(c)
	txs, total, err := h.service.List(c.Request.Context(), userID, page, limit)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"transactions": txs, "total": total, "page": page, "limit": limit,
	}})
}

type recordSaleRequest struct {
	UserID      string `json:"userId" binding:"required"`
	OrderID     string `json:"orderId" binding:"required"`
	OrderNumber string `json:"orderNumber" binding:"required"`
	GrossAmount int    `json:"grossAmount" binding:"required"`
}

// RecordSale — POST /api/v1/internal/orders/paid — appelé serveur-à-serveur
// par backend/ (Node) dès qu'une commande passe payée, une fois par
// marchand concerné (jamais depuis le navigateur — protégé par
// middleware.RequireAdmin comme le reste de /api/v1/admin).
func (h *WalletHandler) RecordSale(c *gin.Context) {
	var req recordSaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Requête invalide", err))
		return
	}

	tx, err := h.service.RecordSale(c.Request.Context(), services.RecordSaleInput{
		UserID: req.UserID, OrderID: req.OrderID, OrderNumber: req.OrderNumber, GrossAmount: req.GrossAmount,
	})
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": tx})
}
