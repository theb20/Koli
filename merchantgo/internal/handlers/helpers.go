package handlers

import "github.com/google/uuid"

// uuidValue enveloppe uuid.UUID pour renvoyer une valeur zéro explicite
// depuis parseApplicationID en cas d'erreur, sans exposer uuid.Nil comme
// s'il s'agissait d'un ID valide.
type uuidValue struct {
	UUID uuid.UUID
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}
