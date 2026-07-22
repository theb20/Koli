package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"stockgo/internal/utils"
)

// RespondError centralise la traduction erreur → réponse HTTP JSON. Les
// AppError portent un code et un message déjà sûrs à afficher ; toute autre
// erreur (bug, panique récupérée, erreur tierce non enveloppée) est traitée
// comme une 500 et son détail n'est jamais renvoyé au client — seulement
// logué côté serveur.
func RespondError(c *gin.Context, logger *zap.Logger, err error) {
	if appErr, ok := err.(*utils.AppError); ok {
		if appErr.Status >= http.StatusInternalServerError {
			logger.Error("erreur serveur", zap.Error(appErr), zap.String("path", c.Request.URL.Path))
		}
		c.JSON(appErr.Status, gin.H{"success": false, "message": appErr.Message})
		return
	}

	logger.Error("erreur non gérée", zap.Error(err), zap.String("path", c.Request.URL.Path))
	c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erreur interne du serveur"})
}

// Recovery intercepte les paniques dans les handlers pour éviter qu'une
// seule requête ne fasse crasher tout le processus — répond 500 proprement
// et logue la stack trace pour le diagnostic.
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				logger.Error("panique récupérée",
					zap.Any("recover", r),
					zap.String("path", c.Request.URL.Path),
				)
				c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erreur interne du serveur"})
				c.Abort()
			}
		}()
		c.Next()
	}
}
