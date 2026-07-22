package utils

import "net/http"

// AppError est l'erreur métier standard de l'application — porte le code
// HTTP à renvoyer, un message sûr pour le client, et l'erreur interne
// d'origine (jamais exposée telle quelle au client, seulement loguée).
type AppError struct {
	Status  int
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

func (e *AppError) Unwrap() error { return e.Err }

func NewAppError(status int, message string, err error) *AppError {
	return &AppError{Status: status, Message: message, Err: err}
}

func ErrBadRequest(message string, err error) *AppError {
	return NewAppError(http.StatusBadRequest, message, err)
}

func ErrNotFound(message string) *AppError {
	return NewAppError(http.StatusNotFound, message, nil)
}

func ErrUnauthorized(message string) *AppError {
	return NewAppError(http.StatusUnauthorized, message, nil)
}

func ErrForbidden(message string) *AppError {
	return NewAppError(http.StatusForbidden, message, nil)
}

func ErrTooLarge(message string) *AppError {
	return NewAppError(http.StatusRequestEntityTooLarge, message, nil)
}

func ErrTooManyRequests(message string) *AppError {
	return NewAppError(http.StatusTooManyRequests, message, nil)
}

func ErrInternal(err error) *AppError {
	return NewAppError(http.StatusInternalServerError, "Erreur interne du serveur", err)
}
