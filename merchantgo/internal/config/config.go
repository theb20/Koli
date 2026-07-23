package config

import (
	"strings"

	"github.com/spf13/viper"
)

// Config regroupe toute la configuration de l'application, chargée
// exclusivement depuis les variables d'environnement (12-factor).
type Config struct {
	Port           string
	Env            string
	DatabaseURL    string
	JWTSecret      string
	AdminAPIKey    string
	RateLimitRPS   int
	RateLimitBurst int
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
		Port:           v.GetString("PORT"),
		Env:            v.GetString("ENV"),
		DatabaseURL:    v.GetString("DATABASE_URL"),
		JWTSecret:      v.GetString("JWT_SECRET"),
		AdminAPIKey:    v.GetString("ADMIN_API_KEY"),
		RateLimitRPS:   v.GetInt("RATE_LIMIT_RPS"),
		RateLimitBurst: v.GetInt("RATE_LIMIT_BURST"),
	}

	return cfg, nil
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}
