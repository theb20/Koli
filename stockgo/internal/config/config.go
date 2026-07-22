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
	StoragePath    string
	MaxUploadSize  int64 // en octets
	PublicURL      string
	APIKey         string
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
	v.SetDefault("STORAGE_PATH", "./uploads")
	v.SetDefault("MAX_UPLOAD_SIZE", 104857600) // 100 MB
	v.SetDefault("PUBLIC_URL", "http://localhost:8080")
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
		StoragePath:    v.GetString("STORAGE_PATH"),
		MaxUploadSize:  v.GetInt64("MAX_UPLOAD_SIZE"),
		PublicURL:      v.GetString("PUBLIC_URL"),
		APIKey:         v.GetString("API_KEY"),
		RateLimitRPS:   v.GetInt("RATE_LIMIT_RPS"),
		RateLimitBurst: v.GetInt("RATE_LIMIT_BURST"),
	}

	return cfg, nil
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}
