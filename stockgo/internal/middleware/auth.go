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

// OptionalAuth tente la même authentification que RequireAuth mais ne
// bloque jamais la requête si elle est absente ou invalide — utilisé sur
// GET /files/:id, dont le handler décide lui-même si l'authentification
// était nécessaire selon la visibilité du fichier (public vs private).
// Sans ça, un fichier "public" ne serait jamais réellement accessible à
// un navigateur affichant une simple balise <img>, qui n'envoie ni clé API
// ni JWT.
func OptionalAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if apiKey := c.GetHeader("X-API-Key"); apiKey != "" && cfg.APIKey != "" && apiKey == cfg.APIKey {
			c.Set(ContextOwnerIDKey, "service")
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if tokenString, ok := strings.CutPrefix(authHeader, "Bearer "); ok && tokenString != "" {
			if claims, err := auth.ValidateToken(cfg.JWTSecret, tokenString); err == nil {
				c.Set(ContextOwnerIDKey, claims.Subject)
			}
		}

		c.Next()
	}
}

// IsAuthenticated indique si OptionalAuth (ou RequireAuth) a réussi à
// identifier l'appelant sur cette requête.
func IsAuthenticated(c *gin.Context) bool {
	_, ok := c.Get(ContextOwnerIDKey)
	return ok
}
