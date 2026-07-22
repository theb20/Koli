package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"

	_ "stockgo/docs" // docs Swagger générées par `swag init`
	"stockgo/internal/config"
	"stockgo/internal/handlers"
	"stockgo/internal/middleware"
)

// Setup construit le routeur Gin complet : middlewares globaux, routes
// publiques (health, docs) et routes protégées (/api/v1/files).
func Setup(cfg *config.Config, fileHandler *handlers.FileHandler, logger *zap.Logger) *gin.Engine {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.RequestLogger(logger))

	// Limite dure sur la taille du corps de requête — barrière au niveau
	// HTTP, en plus du contrôle déclaratif fait dans le service sur la
	// taille annoncée du fichier.
	r.Use(func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, cfg.MaxUploadSize+1024*1024)
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "status": "OK"})
	})

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	limiter := middleware.NewIPRateLimiter(cfg.RateLimitRPS, cfg.RateLimitBurst)

	v1 := r.Group("/api/v1")
	v1.Use(middleware.RequireAuth(cfg, logger))
	v1.Use(middleware.RateLimit(limiter, logger))
	{
		files := v1.Group("/files")
		files.POST("", fileHandler.Upload)
		files.GET("", fileHandler.List)
		files.GET("/:id", fileHandler.Download)
		files.GET("/:id/info", fileHandler.Info)
		files.DELETE("/:id", fileHandler.Delete)
	}

	return r
}
