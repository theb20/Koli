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
	// WalletTransaction : l'ancien index unique (user_id, order_id) est
	// remplacé par (user_id, ref_id) pour permettre plusieurs retours par
	// commande — voir models.WalletTransaction. AutoMigrate crée le nouvel
	// index mais ne supprime jamais un index existant qui ne correspond
	// plus aux tags de la struct, il faut donc le faire explicitement et
	// AVANT l'AutoMigrate (sinon l'ancienne contrainte bloquerait toujours
	// l'insertion d'un remboursement sur une commande déjà vendue).
	if db.Migrator().HasIndex(&models.WalletTransaction{}, "idx_wallet_order_user") {
		if err := db.Migrator().DropIndex(&models.WalletTransaction{}, "idx_wallet_order_user"); err != nil {
			return fmt.Errorf("suppression ancien index wallet_transactions: %w", err)
		}
	}

	// ref_id est NOT NULL dans la struct — sur une base déjà peuplée (lignes
	// de vente créées avant ce champ), AutoMigrate essaierait d'ajouter la
	// colonne NOT NULL directement et échouerait (23502, lignes existantes
	// sans valeur). On la crée donc nullable à la main, on la backfille
	// (ref_id = order_id : c'était déjà la clé d'idempotence des ventes
	// avant ce renommage, voir models.WalletTransaction), PUIS AutoMigrate
	// peut passer la contrainte à NOT NULL sans trouver de ligne orpheline.
	if !db.Migrator().HasColumn(&models.WalletTransaction{}, "ref_id") {
		if err := db.Exec(`ALTER TABLE wallet_transactions ADD COLUMN ref_id VARCHAR(100)`).Error; err != nil {
			return fmt.Errorf("ajout colonne ref_id: %w", err)
		}
		if err := db.Exec(`UPDATE wallet_transactions SET ref_id = order_id WHERE ref_id IS NULL`).Error; err != nil {
			return fmt.Errorf("backfill ref_id: %w", err)
		}
	}

	return db.AutoMigrate(
		&models.Application{}, &models.StatusEvent{}, &models.DiditWebhookEvent{},
		&models.SubscriptionPlan{}, &models.MerchantBilling{}, &models.WalletTransaction{},
		&models.PaymentIntent{}, &models.IdempotencyKey{},
	)
}
