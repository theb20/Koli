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
