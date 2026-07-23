// Package main démarre le service Merchantgo : onboarding et workflow de
// validation KYC des marchands Skignas Business (koli-business →
// candidature ; koli-admin → instruction).
package main

import (
	"context"
	"errors"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"merchantgo/internal/config"
	"merchantgo/internal/database"
	"merchantgo/internal/handlers"
	"merchantgo/internal/repository"
	"merchantgo/internal/routes"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
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

	if cfg.JWTSecret == "" || cfg.AdminAPIKey == "" {
		logger.Warn("JWT_SECRET ou ADMIN_API_KEY absent — authentification incomplète")
	}
	if cfg.DiditWebhookSecret == "" {
		logger.Warn("DIDIT_WEBHOOK_SECRET absent — tous les webhooks Didit seront rejetés")
	}

	db, err := database.Connect(cfg.DatabaseURL, cfg.IsProduction())
	if err != nil {
		logger.Fatal("connexion base de données échouée", zap.Error(err))
	}
	if err := database.Migrate(db); err != nil {
		logger.Fatal("migration échouée", zap.Error(err))
	}
	logger.Info("base de données connectée et migrée")

	repo := repository.NewApplicationRepository(db)
	appService := services.NewApplicationService(repo, logger)
	appHandler := handlers.NewApplicationHandler(appService, logger)
	adminHandler := handlers.NewAdminHandler(appService, logger)

	diditEventRepo := repository.NewDiditEventRepository(db)
	kycService := services.NewKycService(diditEventRepo, repo, logger)
	kycWebhookHandler := handlers.NewKycWebhookHandler(kycService, cfg, logger)

	router := routes.Setup(cfg, appHandler, adminHandler, kycWebhookHandler, logger)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
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
