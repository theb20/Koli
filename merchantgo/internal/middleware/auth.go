package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/auth"
	"merchantgo/internal/config"
	"merchantgo/internal/utils"
)

const (
	ContextUserIDKey = "user_id"
	ContextEmailKey  = "email"
	ContextRoleKey   = "role"
)

// RequireAuth protège les routes marchand (/api/v1/applications/me) : exige
// un Bearer JWT valide, émis par le backend Node principal à la connexion
// sur koli-business. C'est ce token qui identifie quelle candidature
// appartient à quel marchand — ce service ne gère pas de session propre.
func RequireAuth(cfg *config.Config, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		tokenString, ok := strings.CutPrefix(authHeader, "Bearer ")
		if !ok || tokenString == "" {
			RespondError(c, logger, utils.ErrUnauthorized("Authentification requise (Authorization: Bearer)"))
			c.Abort()
			return
		}

		claims, err := auth.ValidateToken(cfg.JWTSecret, tokenString)
		if err != nil {
			RespondError(c, logger, utils.ErrUnauthorized("Token invalide ou expiré"))
			c.Abort()
			return
		}

		c.Set(ContextUserIDKey, claims.UserID)
		c.Set(ContextEmailKey, claims.Email)
		c.Set(ContextRoleKey, claims.Role)
		c.Next()
	}
}

// RequireAdmin protège les routes d'instruction des candidatures
// (/api/v1/admin/*) — koli-admin appelle ce service avec une clé de service
// statique, même mécanisme que X-API-Key sur stockgo, plutôt qu'un JWT
// utilisateur (koli-admin n'a pas de compte "marchand").
func RequireAdmin(cfg *config.Config, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" || cfg.AdminAPIKey == "" || apiKey != cfg.AdminAPIKey {
			RespondError(c, logger, utils.ErrUnauthorized("Clé API admin invalide"))
			c.Abort()
			return
		}
		c.Next()
	}
}

// UserID lit l'identifiant du marchand authentifié posé par RequireAuth.
func UserID(c *gin.Context) string {
	v, _ := c.Get(ContextUserIDKey)
	id, _ := v.(string)
	return id
}

// Email lit l'email du marchand authentifié posé par RequireAuth.
func Email(c *gin.Context) string {
	v, _ := c.Get(ContextEmailKey)
	email, _ := v.(string)
	return email
}
