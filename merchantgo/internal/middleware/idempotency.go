package middleware

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/models"
)

// Idempotence des écritures — en-tête Idempotency-Key, même contrat que
// backend/ (middleware/idempotency.ts). Pour une même clé ET un même
// appelant : requête déjà traitée → réponse enregistrée rejouée
// (Idempotent-Replayed: true) ; identique en cours → on attend sa fin puis
// on rejoue (409 si trop long) ; clé réutilisée pour une autre requête →
// 422. 5xx, 401, 408, 429 et connexions coupées ne sont pas figés : la clé
// reste réutilisable pour réessayer.
//
// À placer APRÈS RequireAuth/RequireAdmin (l'appelant doit être identifié).
// Les webhooks et /internal n'en ont pas besoin : idempotence métier
// (event_id Didit, état des PaymentIntent, (order_id, user_id) du wallet).

const IdempotencyHeader = "Idempotency-Key"

var idempotencyKeyRe = regexp.MustCompile(`^[A-Za-z0-9_-]{8,128}$`)

const maxStoredBody = 512 * 1024

// IdempotencyStore — implémenté par repository.IdempotencyRepository.
type IdempotencyStore interface {
	Find(ctx context.Context, scope, key string) (*models.IdempotencyKey, error)
	Create(ctx context.Context, k *models.IdempotencyKey) (bool, error)
	TakeOver(ctx context.Context, scope, key string, staleBefore time.Time) (bool, error)
	Complete(ctx context.Context, scope, key string, code int, body []byte, contentType string) error
	Release(ctx context.Context, scope, key string) error
	PurgeExpired(ctx context.Context, now time.Time) error
}

type IdempotencyOptions struct {
	TTL   time.Duration // conservation d'une réponse (24 h)
	Wait  time.Duration // attente max d'une requête identique en cours (15 s)
	Stale time.Duration // au-delà, un traitement en cours est considéré abandonné (60 s)
}

// captureWriter recopie le corps de la réponse pour pouvoir l'enregistrer.
type captureWriter struct {
	gin.ResponseWriter
	buf bytes.Buffer
}

func (w *captureWriter) Write(b []byte) (int, error) {
	w.buf.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *captureWriter) WriteString(s string) (int, error) {
	w.buf.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

// idempotencyScope : marchand authentifié (JWT) ou admin (clé de service,
// X-Admin-Id pour distinguer les admins) — jamais partagé entre appelants.
func idempotencyScope(c *gin.Context) string {
	if id := UserID(c); id != "" {
		return "u:" + id
	}
	return "admin:" + c.GetHeader("X-Admin-Id")
}

// requestFingerprint : sha256(méthode + URI + corps). Un corps JSON est
// normalisé (clés triées par encoding/json) : { a, b } == { b, a }.
func requestFingerprint(method, uri string, body []byte) string {
	normalized := body
	var v any
	if len(body) > 0 && json.Unmarshal(body, &v) == nil {
		if b, err := json.Marshal(v); err == nil {
			normalized = b
		}
	}
	h := sha256.New()
	h.Write([]byte(method + " " + uri + " "))
	h.Write(normalized)
	return hex.EncodeToString(h.Sum(nil))
}

func storableStatus(code int) bool {
	return code < 500 && code != http.StatusUnauthorized && code != http.StatusRequestTimeout && code != http.StatusTooManyRequests
}

func Idempotency(store IdempotencyStore, logger *zap.Logger, opts IdempotencyOptions) gin.HandlerFunc {
	if opts.TTL == 0 {
		opts.TTL = 24 * time.Hour
	}
	if opts.Wait == 0 {
		opts.Wait = 15 * time.Second
	}
	if opts.Stale == 0 {
		opts.Stale = 60 * time.Second
	}
	var lastPurge atomic.Int64

	return func(c *gin.Context) {
		key := c.GetHeader(IdempotencyHeader)
		switch c.Request.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		default:
			c.Next()
			return
		}
		if key == "" {
			c.Next()
			return
		}
		if !idempotencyKeyRe.MatchString(key) {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"success": false, "message": "En-tête Idempotency-Key invalide (8 à 128 caractères : lettres, chiffres, - et _)"})
			return
		}

		ctx := c.Request.Context()
		now := time.Now()
		if last := lastPurge.Load(); now.Unix()-last > 3600 && lastPurge.CompareAndSwap(last, now.Unix()) {
			go func() {
				if err := store.PurgeExpired(context.Background(), time.Now()); err != nil {
					logger.Error("purge des clés d'idempotence", zap.Error(err))
				}
			}()
		}

		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"success": false, "message": "Corps de requête illisible"})
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewReader(body))

		scope := idempotencyScope(c)
		fingerprint := requestFingerprint(c.Request.Method, c.Request.RequestURI, body)

		// Le stockage ne doit jamais bloquer le service : en cas de panne,
		// la requête est traitée normalement, sans garantie d'idempotence.
		fail := func(err error) {
			logger.Error("stockage d'idempotence indisponible, requête traitée sans protection", zap.Error(err))
			c.Next()
		}

		created, err := store.Create(ctx, &models.IdempotencyKey{
			Scope: scope, Key: key, Fingerprint: fingerprint,
			Status: models.IdempotencyProcessing, LockedAt: now, ExpiresAt: now.Add(opts.TTL),
		})
		if err != nil {
			fail(err)
			return
		}
		if created {
			execute(c, store, logger, scope, key)
			return
		}

		deadline := time.Now().Add(opts.Wait)
		for {
			rec, err := store.Find(ctx, scope, key)
			if err != nil {
				fail(err)
				return
			}
			if rec == nil {
				// Libérée entre-temps (échec de la première tentative) : on la reprend.
				n := time.Now()
				if ok, err := store.Create(ctx, &models.IdempotencyKey{
					Scope: scope, Key: key, Fingerprint: fingerprint,
					Status: models.IdempotencyProcessing, LockedAt: n, ExpiresAt: n.Add(opts.TTL),
				}); err != nil {
					fail(err)
					return
				} else if ok {
					execute(c, store, logger, scope, key)
					return
				}
				continue
			}
			if rec.Fingerprint != fingerprint {
				c.AbortWithStatusJSON(http.StatusUnprocessableEntity, gin.H{"success": false, "message": "Cette clé d'idempotence a déjà servi pour une autre requête."})
				return
			}
			if rec.Status == models.IdempotencyCompleted {
				c.Header("Idempotent-Replayed", "true")
				c.Data(rec.ResponseCode, rec.ContentType, rec.ResponseBody)
				c.Abort()
				return
			}
			if rec.LockedAt.Before(time.Now().Add(-opts.Stale)) {
				if ok, err := store.TakeOver(ctx, scope, key, time.Now().Add(-opts.Stale)); err == nil && ok {
					execute(c, store, logger, scope, key)
					return
				}
			}
			if time.Now().After(deadline) {
				c.Header("Retry-After", "2")
				c.AbortWithStatusJSON(http.StatusConflict, gin.H{"success": false, "message": "Une requête identique est déjà en cours de traitement."})
				return
			}
			select {
			case <-ctx.Done():
				c.Abort()
				return
			case <-time.After(150 * time.Millisecond):
			}
		}
	}
}

// execute lance le handler, puis fige sa réponse ou libère la clé.
func execute(c *gin.Context, store IdempotencyStore, logger *zap.Logger, scope, key string) {
	w := &captureWriter{ResponseWriter: c.Writer}
	c.Writer = w
	c.Next()

	// Contexte détaché : la requête peut déjà être close, l'écriture doit aboutir.
	ctx := context.Background()
	code := w.Status()
	var err error
	if storableStatus(code) && w.buf.Len() <= maxStoredBody && c.Request.Context().Err() == nil {
		err = store.Complete(ctx, scope, key, code, w.buf.Bytes(), w.Header().Get("Content-Type"))
	} else {
		err = store.Release(ctx, scope, key)
	}
	if err != nil {
		logger.Error("enregistrement de la réponse idempotente", zap.Error(err))
	}
}
