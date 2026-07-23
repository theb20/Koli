package auth

import (
	"errors"

	"github.com/golang-jwt/jwt/v5"
)

// Claims reprend exactement la forme du JwtPayload émis par le backend Node
// principal (backend/src/lib/jwt.ts) — ce service ne délivre aucun token,
// il ne fait que vérifier ceux émis à la connexion/inscription sur
// koli-business. JWT_SECRET doit donc être identique entre les deux
// services.
type Claims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

var ErrInvalidToken = errors.New("auth: token invalide ou expiré")

// ValidateToken vérifie la signature et l'expiration d'un access token émis
// par le backend Node, puis retourne ses claims.
func ValidateToken(secret, tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	if claims.UserID == "" {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
