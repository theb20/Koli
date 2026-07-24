package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORS n'autorise que les origines listées explicitement (jamais de
// wildcard '*' : ce service accepte l'en-tête Authorization, un wildcard
// combiné à ça serait rejeté par les navigateurs de toute façon, mais
// surtout ce serait ouvrir l'API à n'importe quel site). L'origine
// autorisée est reflétée telle quelle (pas de '*') pour rester cohérente
// avec un futur passage à credentials: 'include' côté client.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[o] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, X-Admin-Id")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
