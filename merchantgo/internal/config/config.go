package config

import (
	"strings"

	"github.com/spf13/viper"
)

// Config regroupe toute la configuration de l'application, chargée
// exclusivement depuis les variables d'environnement (12-factor).
type Config struct {
	Port               string
	Env                string
	DatabaseURL        string
	JWTSecret          string
	AdminAPIKey        string
	DiditWebhookSecret string
	AllowedOrigins     []string
	RateLimitRPS       int
	RateLimitBurst     int
	// Nombre de jours pendant lequel un marchand ne peut pas changer de
	// modèle économique après un choix — voir models.MerchantBilling.CanChange.
	BillingLockDays int

	// URL publique de CE service, utilisée pour construire le callback_url
	// transmis à WiniPayer à la création d'un paiement (WiniPayer doit
	// pouvoir nous rappeler). En local, WiniPayer ne peut pas atteindre
	// localhost — utiliser un tunnel (ngrok) pour tester le webhook en
	// conditions réelles, sinon seule la vérification manuelle du statut
	// fonctionne (voir internal/winipayer).
	PublicURL string

	// Paiement en ligne WiniPayer — un jeu de clés TEST et un jeu PROD,
	// WiniPayer les distingue strictement (impossible de générer un lien
	// PROD avec des clés TEST et inversement). WinipayerEnv choisit lequel
	// utiliser ("test" par défaut, "prod" en production réelle).
	WinipayerEnv              string
	WinipayerMerchantApplyTest string
	WinipayerMerchantTokenTest string
	WinipayerPrivateKeyTest    string
	WinipayerMerchantApplyProd string
	WinipayerMerchantTokenProd string
	WinipayerPrivateKeyProd    string

	// Secret partagé avec backend/ pour le rappel "commande payée" —
	// merchantgo → backend, sens inverse de ADMIN_API_KEY (backend →
	// merchantgo). DOIT être identique à MERCHANTGO_CALLBACK_SECRET dans
	// backend/.env.
	BackendURL             string
	MerchantgoCallbackSecret string
}

// WinipayerCredentials renvoie le triplet (merchant_apply, merchant_token,
// private_key) correspondant à l'environnement actif — jamais mélangé entre
// test et prod (voir doc WiniPayer).
func (c *Config) WinipayerCredentials() (merchantApply, merchantToken, privateKey string) {
	if c.WinipayerEnv == "prod" {
		return c.WinipayerMerchantApplyProd, c.WinipayerMerchantTokenProd, c.WinipayerPrivateKeyProd
	}
	return c.WinipayerMerchantApplyTest, c.WinipayerMerchantTokenTest, c.WinipayerPrivateKeyTest
}

// WinipayerConfigured indique si les clés de l'environnement actif sont
// renseignées — sert à dégrader proprement (message clair) plutôt que
// d'échouer silencieusement ou de simuler un succès.
func (c *Config) WinipayerConfigured() bool {
	apply, token, key := c.WinipayerCredentials()
	return apply != "" && token != "" && key != ""
}

// defaultAllowedOrigins reprend exactement la liste de
// backend/src/lib/allowedOrigins.ts — les deux services doivent rester
// synchronisés puisque koli-business appelle l'un puis l'autre dans le
// même parcours (inscription).
var defaultAllowedOrigins = []string{
	"http://localhost:5175",
	"https://business.skignas.com",
	"https://skignas-business.web.app",
	"https://skignas-business.firebaseapp.com",
	"http://localhost:5176",
	"https://marchant-e58f1.web.app",
	"https://marchant-e58f1.firebaseapp.com",
	"https://me.skignas.com",
}

// Load lit la configuration depuis les variables d'environnement (avec
// .env en développement) et applique des valeurs par défaut sûres.
func Load() (*Config, error) {
	v := viper.New()

	v.SetConfigName(".env")
	v.SetConfigType("env")
	v.AddConfigPath(".")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	v.SetDefault("PORT", "8080")
	v.SetDefault("ENV", "development")
	v.SetDefault("RATE_LIMIT_RPS", 5)
	v.SetDefault("RATE_LIMIT_BURST", 15)
	v.SetDefault("BILLING_LOCK_DAYS", 30)
	v.SetDefault("WINIPAYER_ENV", "test")
	v.SetDefault("PUBLIC_URL", "http://localhost:8080")

	// .env optionnel — en production (Railway), les variables sont déjà
	// injectées dans l'environnement, pas de fichier à lire.
	_ = v.ReadInConfig()

	cfg := &Config{
		Port:               v.GetString("PORT"),
		Env:                v.GetString("ENV"),
		DatabaseURL:        v.GetString("DATABASE_URL"),
		JWTSecret:          v.GetString("JWT_SECRET"),
		AdminAPIKey:        v.GetString("ADMIN_API_KEY"),
		DiditWebhookSecret: v.GetString("DIDIT_WEBHOOK_SECRET"),
		RateLimitRPS:       v.GetInt("RATE_LIMIT_RPS"),
		RateLimitBurst:     v.GetInt("RATE_LIMIT_BURST"),
		BillingLockDays:    v.GetInt("BILLING_LOCK_DAYS"),

		PublicURL: v.GetString("PUBLIC_URL"),

		WinipayerEnv:               v.GetString("WINIPAYER_ENV"),
		WinipayerMerchantApplyTest: v.GetString("WINIPAYER_MERCHANT_APPLY_TEST"),
		WinipayerMerchantTokenTest: v.GetString("WINIPAYER_MERCHANT_TOKEN_TEST"),
		WinipayerPrivateKeyTest:    v.GetString("WINIPAYER_PRIVATE_KEY_TEST"),
		WinipayerMerchantApplyProd: v.GetString("WINIPAYER_MERCHANT_APPLY_PROD"),
		WinipayerMerchantTokenProd: v.GetString("WINIPAYER_MERCHANT_TOKEN_PROD"),
		WinipayerPrivateKeyProd:    v.GetString("WINIPAYER_PRIVATE_KEY_PROD"),

		BackendURL:               v.GetString("KOLI_BACKEND_URL"),
		MerchantgoCallbackSecret: v.GetString("MERCHANTGO_CALLBACK_SECRET"),
	}

	if raw := v.GetString("ALLOWED_ORIGINS"); raw != "" {
		cfg.AllowedOrigins = strings.Split(raw, ",")
	} else {
		cfg.AllowedOrigins = defaultAllowedOrigins
	}

	return cfg, nil
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}
