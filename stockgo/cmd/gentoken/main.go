// Utilitaire de développement : génère un JWT valide pour tester
// l'authentification Bearer sans passer par un flux d'auth complet.
//
// Usage: go run ./cmd/gentoken <owner_id> [durée, ex: 1h]
package main

import (
	"fmt"
	"os"
	"time"

	"stockgo/internal/auth"
	"stockgo/internal/config"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run ./cmd/gentoken <owner_id> [durée, ex: 1h]")
		os.Exit(1)
	}
	ownerID := os.Args[1]

	ttl := time.Hour
	if len(os.Args) > 2 {
		parsed, err := time.ParseDuration(os.Args[2])
		if err != nil {
			fmt.Println("durée invalide:", err)
			os.Exit(1)
		}
		ttl = parsed
	}

	cfg, err := config.Load()
	if err != nil {
		fmt.Println("erreur config:", err)
		os.Exit(1)
	}

	token, err := auth.GenerateToken(cfg.JWTSecret, ownerID, ttl)
	if err != nil {
		fmt.Println("erreur génération:", err)
		os.Exit(1)
	}
	fmt.Println(token)
}
