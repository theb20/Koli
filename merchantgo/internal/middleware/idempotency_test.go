package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/models"
)

type memStore struct {
	mu   sync.Mutex
	rows map[string]*models.IdempotencyKey
	fail bool
}

func newMemStore() *memStore { return &memStore{rows: map[string]*models.IdempotencyKey{}} }
func id(s, k string) string  { return s + "|" + k }

func (m *memStore) Find(_ context.Context, s, k string) (*models.IdempotencyKey, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r, ok := m.rows[id(s, k)]; ok {
		cp := *r
		return &cp, nil
	}
	return nil, nil
}
func (m *memStore) Create(_ context.Context, r *models.IdempotencyKey) (bool, error) {
	if m.fail {
		return false, errors.New("db down")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.rows[id(r.Scope, r.Key)]; ok {
		return false, nil
	}
	cp := *r
	m.rows[id(r.Scope, r.Key)] = &cp
	return true, nil
}
func (m *memStore) TakeOver(_ context.Context, s, k string, stale time.Time) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	r := m.rows[id(s, k)]
	if r == nil || r.Status != models.IdempotencyProcessing || !r.LockedAt.Before(stale) {
		return false, nil
	}
	r.LockedAt = time.Now()
	return true, nil
}
func (m *memStore) Complete(_ context.Context, s, k string, code int, body []byte, ct string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	r := m.rows[id(s, k)]
	r.Status, r.ResponseCode, r.ResponseBody, r.ContentType = models.IdempotencyCompleted, code, append([]byte(nil), body...), ct
	return nil
}
func (m *memStore) Release(_ context.Context, s, k string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r := m.rows[id(s, k)]; r != nil && r.Status == models.IdempotencyProcessing {
		delete(m.rows, id(s, k))
	}
	return nil
}
func (m *memStore) PurgeExpired(context.Context, time.Time) error { return nil }

const testKey = "cle-test-0001"

func setup(store IdempotencyStore, handler gin.HandlerFunc, opts IdempotencyOptions) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// Simule RequireAuth : l'identité vient de l'en-tête de test X-User
	r.Use(func(c *gin.Context) { c.Set(ContextUserIDKey, c.GetHeader("X-User")); c.Next() })
	r.Use(Idempotency(store, zap.NewNop(), opts))
	r.Any("/*path", handler)
	return r
}

func do(r http.Handler, method, body, user, key string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, "/api/v1/merchant/billing", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User", user)
	if key != "" {
		req.Header.Set(IdempotencyHeader, key)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func counter(calls *atomic.Int32, code int, delay time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		n := calls.Add(1)
		time.Sleep(delay)
		c.JSON(code, gin.H{"n": n})
	}
}

func TestReplaySameKey(t *testing.T) {
	var calls atomic.Int32
	r := setup(newMemStore(), counter(&calls, 201, 0), IdempotencyOptions{})
	w1 := do(r, "POST", `{"a":1,"b":2}`, "alice", testKey)
	w2 := do(r, "POST", `{"b":2,"a":1}`, "alice", testKey)
	if calls.Load() != 1 || w2.Code != 201 || w2.Body.String() != w1.Body.String() || w2.Header().Get("Idempotent-Replayed") != "true" {
		t.Fatalf("rejeu attendu: calls=%d code=%d body=%q/%q", calls.Load(), w2.Code, w1.Body.String(), w2.Body.String())
	}
}

func TestNoHeaderNoProtection(t *testing.T) {
	var calls atomic.Int32
	r := setup(newMemStore(), counter(&calls, 200, 0), IdempotencyOptions{})
	do(r, "POST", `{}`, "alice", "")
	do(r, "POST", `{}`, "alice", "")
	if calls.Load() != 2 {
		t.Fatalf("calls=%d", calls.Load())
	}
}

func TestKeyReusedForOtherRequest(t *testing.T) {
	var calls atomic.Int32
	r := setup(newMemStore(), counter(&calls, 200, 0), IdempotencyOptions{})
	do(r, "PUT", `{"mode":"commission"}`, "alice", testKey)
	if w := do(r, "PUT", `{"mode":"subscription"}`, "alice", testKey); w.Code != 422 || calls.Load() != 1 {
		t.Fatalf("422 attendu, code=%d calls=%d", w.Code, calls.Load())
	}
}

func TestConcurrentDoubleClick(t *testing.T) {
	var calls atomic.Int32
	r := setup(newMemStore(), counter(&calls, 201, 200*time.Millisecond), IdempotencyOptions{})
	var wg sync.WaitGroup
	codes := make([]int, 2)
	for i := range 2 {
		wg.Add(1)
		go func() { defer wg.Done(); codes[i] = do(r, "POST", `{}`, "alice", testKey).Code }()
	}
	wg.Wait()
	if calls.Load() != 1 || codes[0] != 201 || codes[1] != 201 {
		t.Fatalf("une seule exécution attendue: calls=%d codes=%v", calls.Load(), codes)
	}
}

func TestServerErrorNotStored(t *testing.T) {
	var calls atomic.Int32
	r := setup(newMemStore(), func(c *gin.Context) {
		if calls.Add(1) == 1 {
			c.JSON(500, gin.H{})
			return
		}
		c.JSON(200, gin.H{})
	}, IdempotencyOptions{})
	do(r, "POST", `{}`, "alice", testKey)
	if w := do(r, "POST", `{}`, "alice", testKey); w.Code != 200 || calls.Load() != 2 {
		t.Fatalf("retry après 5xx attendu: code=%d calls=%d", w.Code, calls.Load())
	}
}

func TestScopePerUser(t *testing.T) {
	var calls atomic.Int32
	r := setup(newMemStore(), counter(&calls, 200, 0), IdempotencyOptions{})
	do(r, "POST", `{}`, "alice", testKey)
	if w := do(r, "POST", `{}`, "bob", testKey); w.Header().Get("Idempotent-Replayed") != "" || calls.Load() != 2 {
		t.Fatalf("clé rejouée entre utilisateurs")
	}
}

func TestInvalidKeyAndStoreDown(t *testing.T) {
	var calls atomic.Int32
	st := newMemStore()
	r := setup(st, counter(&calls, 200, 0), IdempotencyOptions{})
	if w := do(r, "POST", `{}`, "alice", "court"); w.Code != 400 {
		t.Fatalf("400 attendu, %d", w.Code)
	}
	st.fail = true
	if w := do(r, "POST", `{}`, "alice", testKey); w.Code != 200 || calls.Load() != 1 {
		t.Fatalf("panne du stockage ne doit pas bloquer: code=%d", w.Code)
	}
}

func TestInProgressTimeout(t *testing.T) {
	var calls atomic.Int32
	r := setup(newMemStore(), counter(&calls, 201, 400*time.Millisecond), IdempotencyOptions{Wait: 50 * time.Millisecond})
	done := make(chan int)
	go func() { done <- do(r, "POST", `{}`, "alice", testKey).Code }()
	time.Sleep(50 * time.Millisecond)
	if w := do(r, "POST", `{}`, "alice", testKey); w.Code != 409 || w.Header().Get("Retry-After") != "2" {
		t.Fatalf("409 attendu, %d", w.Code)
	}
	if code := <-done; code != 201 {
		t.Fatalf("première requête: %d", code)
	}
}
