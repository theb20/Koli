package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"stockgo/internal/auth"
	"stockgo/internal/config"
	"stockgo/internal/utils"
)

const ContextOwnerIDKey = "owner_id"

// RequireAuth protège les routes /api/v1/files : accepte soit une clé de
// service statique (X-API-Key — le cas d'usage principal, l'application
// e-commerce étant la seule cliente prévue de cette API), soit un JWT
// Bearer (pour un usage multi-utilisateurs plus fin si besoin plus tard).
// Au moins un des deux mécanismes doit être configuré et valide.
func RequireAuth(cfg *config.Config, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if apiKey := c.GetHeader("X-API-Key"); apiKey != "" {
			if cfg.APIKey == "" || apiKey != cfg.APIKey {
				RespondError(c, logger, utils.ErrUnauthorized("Clé API invalide"))
				c.Abort()
				return
			}
			c.Set(ContextOwnerIDKey, "service")
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		tokenString, ok := strings.CutPrefix(authHeader, "Bearer ")
		if !ok || tokenString == "" {
			RespondError(c, logger, utils.ErrUnauthorized("Authentification requise (X-API-Key ou Authorization: Bearer)"))
			c.Abort()
			return
		}

		claims, err := auth.ValidateToken(cfg.JWTSecret, tokenString)
		if err != nil {
			RespondError(c, logger, utils.ErrUnauthorized("Token invalide ou expiré"))
			c.Abort()
			return
		}

		c.Set(ContextOwnerIDKey, claims.Subject)
		c.Next()
	}
}
