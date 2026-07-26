package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/config"
	"merchantgo/internal/handlers"
	"merchantgo/internal/middleware"
)

// Setup construit le routeur Gin complet : middlewares globaux, health
// check public, routes marchand (JWT) et routes admin (clé de service).
func Setup(
	cfg *config.Config,
	appHandler *handlers.ApplicationHandler,
	adminHandler *handlers.AdminHandler,
	kycWebhookHandler *handlers.KycWebhookHandler,
	billingHandler *handlers.BillingHandler,
	walletHandler *handlers.WalletHandler,
	planHandler *handlers.SubscriptionPlanHandler,
	logger *zap.Logger,
) *gin.Engine {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.CORS(cfg.AllowedOrigins))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "status": "OK"})
	})

	limiter := middleware.NewIPRateLimiter(cfg.RateLimitRPS, cfg.RateLimitBurst)
	rateLimit := middleware.RateLimit(limiter, logger)

	v1 := r.Group("/api/v1")
	v1.Use(rateLimit)
	{
		// Authentifié par signature HMAC (X-Signature-V2), pas par
		// RequireAuth/RequireAdmin — c'est Didit qui appelle cette route,
		// pas un marchand ni koli-admin.
		v1.POST("/webhooks/didit", kycWebhookHandler.Receive)

		applications := v1.Group("/applications")
		applications.Use(middleware.RequireAuth(cfg, logger))
		{
			applications.PUT("/me", appHandler.SaveDraft)
			applications.GET("/me", appHandler.GetMine)
			applications.POST("/me/submit", appHandler.Submit)
		}

		admin := v1.Group("/admin/applications")
		admin.Use(middleware.RequireAdmin(cfg, logger))
		{
			admin.GET("", adminHandler.List)
			admin.GET("/:id", adminHandler.Get)
			admin.POST("/:id/approve", adminHandler.Approve)
			admin.POST("/:id/reject", adminHandler.Reject)
		}

		// Modèle économique + portefeuille — authentifié par le même JWT
		// backend/ que /applications (voir middleware.RequireAuth).
		merchant := v1.Group("/merchant")
		merchant.Use(middleware.RequireAuth(cfg, logger))
		{
			merchant.GET("/billing", billingHandler.GetMine)
			merchant.PUT("/billing", billingHandler.Choose)
			merchant.GET("/wallet/balance", walletHandler.Balance)
			merchant.GET("/wallet/transactions", walletHandler.ListTransactions)
		}

		// Catalogue de plans, lecture publique (koli-business/koli-marchand
		// doivent pouvoir l'afficher avant même la création du compte).
		v1.GET("/subscription-plans", planHandler.List)

		adminBilling := v1.Group("/admin/subscription-plans")
		adminBilling.Use(middleware.RequireAdmin(cfg, logger))
		{
			adminBilling.GET("", planHandler.List)
			adminBilling.POST("", planHandler.Create)
			adminBilling.PUT("/:id", planHandler.Update)
			adminBilling.DELETE("/:id", planHandler.Delete)
		}

		// Interne, appelé serveur-à-serveur par backend/ (Node) — jamais par
		// un navigateur. Même clé que les autres routes /admin (X-API-Key).
		internal := v1.Group("/internal")
		internal.Use(middleware.RequireAdmin(cfg, logger))
		{
			internal.POST("/orders/paid", walletHandler.RecordSale)
		}

		adminBillingBulk := v1.Group("/admin/billing")
		adminBillingBulk.Use(middleware.RequireAdmin(cfg, logger))
		{
			adminBillingBulk.POST("/bulk", billingHandler.GetBulk)
			adminBillingBulk.PUT("/:userId", billingHandler.AdminSet)
		}
	}

	return r
}
