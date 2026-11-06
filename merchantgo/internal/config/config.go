package config

import (
	"math"
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
	// Délai de grâce (jours après l'échéance) avant suspension AUTOMATIQUE
	// d'un marchand pour facture d'abonnement impayée — voir
	// services/subscription_billing_service.go, EscalateOverdue.
	SubscriptionGraceDays int
	// Délai (jours après le 1er du mois facturé) avant échéance d'une
	// facture d'abonnement — voir generateForCurrentPeriod. Les deux valeurs
	// par défaut (7 + 5) sont volontairement sur deux variables séparées
	// plutôt qu'en dur : utile pour un test de bout en bout accéléré
	// (passer les deux à 0 en env de test) sans toucher au code.
	SubscriptionDueDays int

	// URL publique de CE service, utilisée pour construire le callback_url
	// transmis à WiniPayer à la création d'un paiement (WiniPayer doit
	// pouvoir nous rappeler). En local, WiniPayer ne peut pas atteindre
	// localhost — utiliser un tunnel (ngrok) pour tester le webhook en
	// conditions réelles, sinon seule la vérification manuelle du statut
	// fonctionne (voir internal/winipayer).
	PublicURL string

	// WiniPayer — RETIRÉ comme passerelle active (voir GeniusPay ci-dessous) :
	// CreatePayment n'en crée plus. Champs et méthodes conservés tels quels
	// (même esprit que PayDunya avant lui) uniquement pour que les paiements
	// WiniPayer déjà en attente au moment de la bascule puissent recevoir
	// leur webhook et être revérifiés jusqu'à leur terme — voir les routes
	// /webhooks/winipayer et /payments/winipayer/:ref/refresh, restées
	// montées, et payment_service.ConfirmPayment (dispatch par
	// PaymentIntent.Provider).
	WinipayerEnv               string
	WinipayerMerchantApplyTest string
	WinipayerMerchantTokenTest string
	WinipayerPrivateKeyTest    string
	WinipayerMerchantApplyProd string
	WinipayerMerchantTokenProd string
	WinipayerPrivateKeyProd    string

	// Paiement en ligne GENIUSPAY — passerelle active (remplace WiniPayer,
	// voir ci-dessus). Un jeu de clés sandbox et un jeu live, jamais
	// mélangés (même doctrine que WiniPayer). GeniusPayBaseURL permet de
	// corriger l'URL de base sans redéploiement si besoin (voir le
	// commentaire de tête de internal/geniuspay/client.go — une seule
	// source a pu être corroborée pour cette valeur, à confirmer en sandbox).
	GeniusPayEnv           string
	GeniusPayAPIKeySandbox string
	GeniusPaySecretSandbox string
	GeniusPayAPIKeyLive    string
	GeniusPaySecretLive    string
	GeniusPayWebhookSecret string
	GeniusPayBaseURL       string

	// Frais réels prélevés par GeniusPay sur chaque transaction encaissée
	// (voir dashboard GeniusPay → Transactions, colonnes "Fr. Gateway" et
	// "Fr. GeniusPay") : frais passerelle en %, frais GeniusPay fixe + en %.
	// Configurables (pas codés en dur) car GeniusPay peut les faire évoluer
	// sans prévenir — voir GeniusPayFeeAmount. Ne concernent QUE les ventes
	// payées en ligne (jamais le paiement à la livraison).
	GeniusPayGatewayFeeRate float64 // %, ex. 1.5
	GeniusPayFixedFee       int     // FCFA, ex. 100
	GeniusPayFeeRate        float64 // %, ex. 1.0

	// Secret partagé avec backend/ pour le rappel "commande payée" —
	// merchantgo → backend, sens inverse de ADMIN_API_KEY (backend →
	// merchantgo). DOIT être identique à MERCHANTGO_CALLBACK_SECRET dans
	// backend/.env.
	BackendURL               string
	MerchantgoCallbackSecret string

	// URL publique de koli-marchand — utilisée comme success_url/error_url
	// GeniusPay pour une facture d'abonnement (le navigateur du marchand y
	// est redirigé après paiement, voir subscription_billing_service.go).
	// Vide en dev : repli sur https://me.skignas.com codé en dur.
	MerchantFrontendURL string
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

// GeniusPayCredentials renvoie le couple (api_key, api_secret) correspondant
// à l'environnement actif — jamais mélangé entre sandbox et live.
func (c *Config) GeniusPayCredentials() (apiKey, apiSecret string) {
	if c.GeniusPayEnv == "live" {
		return c.GeniusPayAPIKeyLive, c.GeniusPaySecretLive
	}
	return c.GeniusPayAPIKeySandbox, c.GeniusPaySecretSandbox
}

// GeniusPayConfigured indique si les clés de l'environnement actif sont
// renseignées.
func (c *Config) GeniusPayConfigured() bool {
	key, secret := c.GeniusPayCredentials()
	return key != "" && secret != ""
}

// GeniusPayFeeAmount calcule les frais réels que GeniusPay prélève sur un
// encaissement de `amount` FCFA — reproduit la formule observée dans le
// dashboard GeniusPay (Transactions) : frais passerelle (%, arrondi), puis
// frais GeniusPay (fixe + %, arrondi), les deux sommés. N'est JAMAIS déduit
// du net versé au marchand (voir wallet_service.go) : sert uniquement à
// calculer la marge RÉELLE de Skignas (commission − ces frais), puisque
// GeniusPay prélève sa part avant même que Skignas ne touche l'argent.
func (c *Config) GeniusPayFeeAmount(amount int) int {
	if amount <= 0 {
		return 0
	}
	gateway := math.Round(float64(amount) * c.GeniusPayGatewayFeeRate / 100)
	geniuspay := math.Round(float64(amount)*c.GeniusPayFeeRate/100) + float64(c.GeniusPayFixedFee)
	return int(gateway + geniuspay)
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
	v.SetDefault("SUBSCRIPTION_GRACE_DAYS", 5)
	v.SetDefault("SUBSCRIPTION_DUE_DAYS", 7)
	v.SetDefault("WINIPAYER_ENV", "test")
	v.SetDefault("GENIUSPAY_ENV", "sandbox")
	v.SetDefault("GENIUSPAY_GATEWAY_FEE_RATE", 1.5)
	v.SetDefault("GENIUSPAY_FIXED_FEE", 100)
	v.SetDefault("GENIUSPAY_FEE_RATE", 1.0)
	v.SetDefault("PUBLIC_URL", "http://localhost:8080")

	// .env optionnel — en production (Railway), les variables sont déjà
	// injectées dans l'environnement, pas de fichier à lire.
	_ = v.ReadInConfig()

	cfg := &Config{
		Port:                  v.GetString("PORT"),
		Env:                   v.GetString("ENV"),
		DatabaseURL:           v.GetString("DATABASE_URL"),
		JWTSecret:             v.GetString("JWT_SECRET"),
		AdminAPIKey:           v.GetString("ADMIN_API_KEY"),
		DiditWebhookSecret:    v.GetString("DIDIT_WEBHOOK_SECRET"),
		RateLimitRPS:          v.GetInt("RATE_LIMIT_RPS"),
		RateLimitBurst:        v.GetInt("RATE_LIMIT_BURST"),
		BillingLockDays:       v.GetInt("BILLING_LOCK_DAYS"),
		SubscriptionGraceDays: v.GetInt("SUBSCRIPTION_GRACE_DAYS"),
		SubscriptionDueDays:   v.GetInt("SUBSCRIPTION_DUE_DAYS"),

		PublicURL: v.GetString("PUBLIC_URL"),

		WinipayerEnv:               v.GetString("WINIPAYER_ENV"),
		WinipayerMerchantApplyTest: v.GetString("WINIPAYER_MERCHANT_APPLY_TEST"),
		WinipayerMerchantTokenTest: v.GetString("WINIPAYER_MERCHANT_TOKEN_TEST"),
		WinipayerPrivateKeyTest:    v.GetString("WINIPAYER_PRIVATE_KEY_TEST"),
		WinipayerMerchantApplyProd: v.GetString("WINIPAYER_MERCHANT_APPLY_PROD"),
		WinipayerMerchantTokenProd: v.GetString("WINIPAYER_MERCHANT_TOKEN_PROD"),
		WinipayerPrivateKeyProd:    v.GetString("WINIPAYER_PRIVATE_KEY_PROD"),

		GeniusPayEnv:           v.GetString("GENIUSPAY_ENV"),
		GeniusPayAPIKeySandbox: v.GetString("GENIUSPAY_API_KEY_SANDBOX"),
		GeniusPaySecretSandbox: v.GetString("GENIUSPAY_API_SECRET_SANDBOX"),
		GeniusPayAPIKeyLive:    v.GetString("GENIUSPAY_API_KEY_LIVE"),
		GeniusPaySecretLive:    v.GetString("GENIUSPAY_API_SECRET_LIVE"),
		GeniusPayWebhookSecret: v.GetString("GENIUSPAY_WEBHOOK_SECRET"),
		GeniusPayBaseURL:       v.GetString("GENIUSPAY_BASE_URL"),

		GeniusPayGatewayFeeRate: v.GetFloat64("GENIUSPAY_GATEWAY_FEE_RATE"),
		GeniusPayFixedFee:       v.GetInt("GENIUSPAY_FIXED_FEE"),
		GeniusPayFeeRate:        v.GetFloat64("GENIUSPAY_FEE_RATE"),

		BackendURL:               v.GetString("KOLI_BACKEND_URL"),
		MerchantgoCallbackSecret: v.GetString("MERCHANTGO_CALLBACK_SECRET"),
		MerchantFrontendURL:      v.GetString("MERCHANT_FRONTEND_URL"),
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
