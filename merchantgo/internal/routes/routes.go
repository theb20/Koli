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
	paymentHandler *handlers.PaymentHandler,
	settlementHandler *handlers.SettlementHandler,
	payoutMethodHandler *handlers.PayoutMethodHandler,
	subscriptionInvoiceHandler *handlers.SubscriptionInvoiceHandler,
	idempotency gin.HandlerFunc,
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

		// LEGACY — sert les transactions WiniPayer déjà en attente au moment
		// de la bascule vers GeniusPay (voir CreateGeniusPayPayment) ;
		// aucune nouvelle transaction WiniPayer n'est plus créée, cette
		// route cessera de recevoir des appels une fois les dernières
		// transactions en attente résolues. Authentifié par hash (voir
		// handlers.PaymentHandler.Webhook), pas par RequireAuth/RequireAdmin
		// — c'est WiniPayer qui appelle.
		v1.POST("/webhooks/winipayer", paymentHandler.Webhook)

		// Authentifié par signature HMAC (voir
		// handlers.PaymentHandler.GeniusPayWebhook), pas par
		// RequireAuth/RequireAdmin — c'est GeniusPay qui appelle.
		v1.POST("/webhooks/geniuspay", paymentHandler.GeniusPayWebhook)

		applications := v1.Group("/applications")
		applications.Use(middleware.RequireAuth(cfg, logger), idempotency)
		{
			applications.PUT("/me", appHandler.SaveDraft)
			applications.GET("/me", appHandler.GetMine)
			applications.POST("/me/submit", appHandler.Submit)
		}

		admin := v1.Group("/admin/applications")
		admin.Use(middleware.RequireAdmin(cfg, logger), idempotency)
		{
			admin.GET("", adminHandler.List)
			admin.GET("/:id", adminHandler.Get)
			admin.POST("/:id/approve", adminHandler.Approve)
			admin.POST("/:id/reject", adminHandler.Reject)
		}

		// Modèle économique + portefeuille — authentifié par le même JWT
		// backend/ que /applications (voir middleware.RequireAuth).
		merchant := v1.Group("/merchant")
		merchant.Use(middleware.RequireAuth(cfg, logger), idempotency)
		{
			// Lecture seule : le marchand voit son modèle économique mais ne
			// peut plus le changer lui-même — réservé à l'équipe Skignas, voir
			// adminBillingBulk.PUT("/:userId", billingHandler.AdminSet) plus bas.
			// PUT retiré délibérément (anciennement billingHandler.Choose).
			merchant.GET("/billing", billingHandler.GetMine)
			merchant.GET("/wallet/balance", walletHandler.Balance)
			merchant.GET("/wallet/transactions", walletHandler.ListTransactions)
			merchant.GET("/settlements", settlementHandler.ListMine)
			merchant.GET("/subscription-invoices", subscriptionInvoiceHandler.ListMine)
			// Méthode de versement Mobile Money — self-service, voir
			// services.PayoutMethodService (pas réservé à l'équipe Skignas,
			// contrairement au modèle économique).
			merchant.GET("/payout-method", payoutMethodHandler.GetMine)
			merchant.PUT("/payout-method", payoutMethodHandler.SetMine)
		}

		// Catalogue de plans, lecture publique (koli-business/koli-marchand
		// doivent pouvoir l'afficher avant même la création du compte).
		v1.GET("/subscription-plans", planHandler.List)

		adminBilling := v1.Group("/admin/subscription-plans")
		adminBilling.Use(middleware.RequireAdmin(cfg, logger), idempotency)
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
			internal.POST("/orders/refunded", walletHandler.RecordRefund)
			internal.POST("/settlements/generate", settlementHandler.Generate)
			internal.GET("/settlements/:id", settlementHandler.GetByID)
			internal.POST("/settlements/:id/mark-sent", settlementHandler.MarkSent)
			// LEGACY — pas de /payments/winipayer/create : plus aucune
			// nouvelle transaction WiniPayer ne doit être créée (voir
			// payment_service.CreatePayment). /refresh reste monté pour
			// les transactions encore en attente au moment de la bascule.
			internal.POST("/payments/winipayer/:providerRef/refresh", paymentHandler.RefreshWinipayerPayment)
			internal.POST("/payments/geniuspay/create", paymentHandler.CreateGeniusPayPayment)
			internal.POST("/payments/geniuspay/:providerRef/refresh", paymentHandler.RefreshGeniusPayPayment)
		}

		adminBillingBulk := v1.Group("/admin/billing")
		adminBillingBulk.Use(middleware.RequireAdmin(cfg, logger), idempotency)
		{
			adminBillingBulk.POST("/bulk", billingHandler.GetBulk)
			adminBillingBulk.PUT("/:userId", billingHandler.AdminSet)
		}

		// Dérogation manuelle à la facturation automatique — voir
		// SubscriptionBillingService.AdminMarkPaid.
		adminSubscriptionInvoices := v1.Group("/admin/subscription-invoices")
		adminSubscriptionInvoices.Use(middleware.RequireAdmin(cfg, logger), idempotency)
		{
			adminSubscriptionInvoices.GET("/:userId", subscriptionInvoiceHandler.AdminListByUser)
			adminSubscriptionInvoices.PUT("/:id/mark-paid", subscriptionInvoiceHandler.AdminMarkPaid)
		}

		adminSettlements := v1.Group("/admin/settlements")
		adminSettlements.Use(middleware.RequireAdmin(cfg, logger), idempotency)
		{
			adminSettlements.PUT("/:id/retry-payout", settlementHandler.AdminRetryPayout)
		}
	}

	return r
}
