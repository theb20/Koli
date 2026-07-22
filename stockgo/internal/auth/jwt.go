package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims est le contenu du token JWT — Subject porte l'identifiant du
// propriétaire des fichiers (owner_id), utilisé pour scoper les accès.
type Claims struct {
	jwt.RegisteredClaims
}

var ErrInvalidToken = errors.New("auth: token invalide ou expiré")

// GenerateToken émet un JWT signé HS256 pour le owner donné.
func GenerateToken(secret, ownerID string, ttl time.Duration) (string, error) {
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   ownerID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken vérifie la signature et l'expiration, puis retourne les
// claims si le token est valide.
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
	return claims, nil
}
