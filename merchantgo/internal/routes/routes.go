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
func Setup(cfg *config.Config, appHandler *handlers.ApplicationHandler, adminHandler *handlers.AdminHandler, logger *zap.Logger) *gin.Engine {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.RequestLogger(logger))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "status": "OK"})
	})

	limiter := middleware.NewIPRateLimiter(cfg.RateLimitRPS, cfg.RateLimitBurst)
	rateLimit := middleware.RateLimit(limiter, logger)

	v1 := r.Group("/api/v1")
	v1.Use(rateLimit)
	{
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
	}

	return r
}
