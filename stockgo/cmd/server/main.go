// Package main démarre le Storage Service.
//
// @title           Stockgo Storage Service
// @version         1.0
// @description     Service de stockage de fichiers indépendant, style Backblaze B2 simplifié, pour l'écosystème Skignas.
// @BasePath        /
// @securityDefinitions.apikey  ApiKeyAuth
// @in                          header
// @name                        X-API-Key
package main

import (
	"context"
	"errors"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"stockgo/internal/config"
	"stockgo/internal/database"
	"stockgo/internal/handlers"
	"stockgo/internal/repository"
	"stockgo/internal/routes"
	"stockgo/internal/services"
	"stockgo/internal/storage"
	"stockgo/internal/utils"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic("chargement configuration: " + err.Error())
	}

	logger, err := utils.NewLogger(cfg.Env)
	if err != nil {
		panic("initialisation logger: " + err.Error())
	}
	defer logger.Sync()

	if cfg.JWTSecret == "" || cfg.APIKey == "" {
		logger.Warn("JWT_SECRET ou API_KEY absent — le service acceptera uniquement le mécanisme configuré")
	}

	db, err := database.Connect(cfg.DatabaseURL, cfg.IsProduction())
	if err != nil {
		logger.Fatal("connexion base de données échouée", zap.Error(err))
	}
	if err := database.Migrate(db); err != nil {
		logger.Fatal("migration échouée", zap.Error(err))
	}
	logger.Info("base de données connectée et migrée")

	localStorage, err := storage.NewLocalStorage(cfg.StoragePath)
	if err != nil {
		logger.Fatal("initialisation du stockage échouée", zap.Error(err))
	}

	repo := repository.NewFileRepository(db)
	fileService := services.NewFileService(repo, localStorage, cfg.MaxUploadSize, cfg.PublicURL, logger)
	fileHandler := handlers.NewFileHandler(fileService, cfg.PublicURL, logger)

	router := routes.Setup(cfg, fileHandler, logger)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Info("serveur démarré", zap.String("port", cfg.Port), zap.String("env", cfg.Env))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal("échec du serveur", zap.Error(err))
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()

	logger.Info("arrêt en cours...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("arrêt forcé", zap.Error(err))
	}
	logger.Info("serveur arrêté proprement")
}
