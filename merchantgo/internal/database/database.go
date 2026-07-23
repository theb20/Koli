package database

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"merchantgo/internal/models"
)

// Connect ouvre la connexion PostgreSQL via GORM et configure le pool de
// connexions sous-jacent (database/sql) — des bornes explicites évitent
// qu'un pic de trafic n'épuise les connexions disponibles côté Postgres.
func Connect(dsn string, production bool) (*gorm.DB, error) {
	logLevel := gormlogger.Warn
	if !production {
		logLevel = gormlogger.Info
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormlogger.Default.LogMode(logLevel),
		// Permet de comparer les erreurs de contrainte (violation d'unicité
		// sur event_id...) à gorm.ErrDuplicatedKey indépendamment du driver,
		// plutôt que de parser un message d'erreur pgx spécifique.
		TranslateError: true,
	})
	if err != nil {
		return nil, fmt.Errorf("connexion base de données: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("récupération pool sql: %w", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	return db, nil
}

// Migrate applique les migrations de schéma (AutoMigrate — suffisant ici,
// pas de migrations de données complexes à gérer manuellement).
func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(&models.Application{}, &models.StatusEvent{}, &models.DiditWebhookEvent{})
}
