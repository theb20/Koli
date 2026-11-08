package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"go.uber.org/zap"

	"merchantgo/internal/config"
	"merchantgo/internal/models"
)

// concurrentFakeRepo — contrairement à fakePaymentRepo (payment_service_test.go,
// pensé pour un scénario séquentiel), celui-ci protège son état par mutex et
// se comporte comme une vraie table : Create() rend l'intent immédiatement
// visible à FindPendingByOrderID() pour CE orderID. Sert à vérifier que le
// verrou applicatif (orderLocks dans payment_service.go) empêche bien deux
// créations concurrentes pour LA MÊME commande, sans jamais sérialiser deux
// commandes DIFFÉRENTES entre elles.
type concurrentFakeRepo struct {
	mu             sync.Mutex
	pendingByOrder map[string]*models.PaymentIntent
	createCalls    int32
}

func newConcurrentFakeRepo() *concurrentFakeRepo {
	return &concurrentFakeRepo{pendingByOrder: map[string]*models.PaymentIntent{}}
}

func (f *concurrentFakeRepo) Create(_ context.Context, p *models.PaymentIntent) error {
	atomic.AddInt32(&f.createCalls, 1)
	f.mu.Lock()
	f.pendingByOrder[p.OrderID] = p
	f.mu.Unlock()
	return nil
}
func (f *concurrentFakeRepo) FindByProviderRef(context.Context, string) (*models.PaymentIntent, error) {
	return nil, nil
}
func (f *concurrentFakeRepo) FindPendingByOrderID(_ context.Context, orderID string) (*models.PaymentIntent, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.pendingByOrder[orderID], nil
}
func (f *concurrentFakeRepo) Update(context.Context, *models.PaymentIntent) error { return nil }

// fakeGeniusPayServer simule POST /payments avec une latence artificielle
// (pour rendre un éventuel sérialisation globale détectable au chrono) et
// compte les appels réellement reçus.
func fakeGeniusPayServer(delay time.Duration, calls *int32) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(calls, 1)
		time.Sleep(delay)
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		orderID, _ := body["metadata"].(map[string]any)["order_id"].(string)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"reference":    "ref-" + orderID,
			"status":       "pending",
			"checkout_url": "https://pay.example/" + orderID,
		})
	}))
}

// TestCreatePaymentSameOrderConcurrentIsSerialized — N requêtes simultanées
// pour LA MÊME commande (double-clic, ou double webhook retry côté client)
// ne doivent produire qu'UN seul appel GeniusPay et UNE seule ligne
// PaymentIntent — sans ça, un client verrait deux liens de paiement
// différents pour la même commande (voir doctrine en tête de CreatePayment).
func TestCreatePaymentSameOrderConcurrentIsSerialized(t *testing.T) {
	var geniusPayCalls int32
	server := fakeGeniusPayServer(20*time.Millisecond, &geniusPayCalls)
	defer server.Close()

	repo := newConcurrentFakeRepo()
	cfg := &config.Config{
		GeniusPayEnv:           "sandbox",
		GeniusPayAPIKeySandbox: "k",
		GeniusPaySecretSandbox: "s",
		GeniusPayBaseURL:       server.URL,
	}
	svc := NewPaymentService(repo, cfg, nil, zap.NewNop())

	const n = 20
	var wg sync.WaitGroup
	refs := make([]string, n)
	errs := make([]error, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			intent, err := svc.CreatePayment(context.Background(), CreatePaymentInput{
				OrderID: "order-same", OrderNumber: "KLI-1", Amount: 5000,
			})
			errs[i] = err
			if intent != nil {
				refs[i] = intent.ProviderRef
			}
		}(i)
	}
	wg.Wait()

	for i, err := range errs {
		if err != nil {
			t.Fatalf("goroutine %d: erreur inattendue: %v", i, err)
		}
	}
	for i, ref := range refs {
		if ref != refs[0] {
			t.Fatalf("goroutine %d a reçu une référence différente (%s vs %s) — deux paiements créés pour la même commande", i, ref, refs[0])
		}
	}
	if got := atomic.LoadInt32(&geniusPayCalls); got != 1 {
		t.Fatalf("attendu exactement 1 appel GeniusPay pour %d requêtes concurrentes sur la même commande, got %d", n, got)
	}
	if got := atomic.LoadInt32(&repo.createCalls); got != 1 {
		t.Fatalf("attendu exactement 1 PaymentIntent créé, got %d", got)
	}
}

// TestCreatePaymentDifferentOrdersRunInParallel — des commandes DIFFÉRENTES
// ne doivent jamais se bloquer entre elles : le verrou de CreatePayment est
// par orderID (sync.Map), pas global. On le prouve au chrono : si c'était
// sérialisé, N commandes avec un délai artificiel de `delay` chacune
// prendraient N*delay ; en parallèle, ça doit rester proche de `delay`.
func TestCreatePaymentDifferentOrdersRunInParallel(t *testing.T) {
	const n = 15
	const delay = 40 * time.Millisecond

	var geniusPayCalls int32
	server := fakeGeniusPayServer(delay, &geniusPayCalls)
	defer server.Close()

	repo := newConcurrentFakeRepo()
	cfg := &config.Config{
		GeniusPayEnv:           "sandbox",
		GeniusPayAPIKeySandbox: "k",
		GeniusPaySecretSandbox: "s",
		GeniusPayBaseURL:       server.URL,
	}
	svc := NewPaymentService(repo, cfg, nil, zap.NewNop())

	var wg sync.WaitGroup
	errs := make([]error, n)
	start := time.Now()
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := svc.CreatePayment(context.Background(), CreatePaymentInput{
				OrderID: fmt.Sprintf("order-%d", i), OrderNumber: fmt.Sprintf("KLI-%d", i), Amount: 5000,
			})
			errs[i] = err
		}(i)
	}
	wg.Wait()
	elapsed := time.Since(start)

	for i, err := range errs {
		if err != nil {
			t.Fatalf("commande %d: erreur inattendue: %v", i, err)
		}
	}
	if got := atomic.LoadInt32(&geniusPayCalls); got != n {
		t.Fatalf("attendu %d appels GeniusPay (un par commande distincte), got %d", n, got)
	}
	if got := atomic.LoadInt32(&repo.createCalls); got != n {
		t.Fatalf("attendu %d PaymentIntent créés, got %d", n, got)
	}
	// Marge large (5x) pour rester fiable en CI chargé — une vraie
	// sérialisation globale donnerait n*delay = 600ms, très loin au-dessus.
	budget := delay * 5
	if elapsed > budget {
		t.Fatalf("commandes différentes semblent sérialisées entre elles : %v écoulé pour %d commandes en parallèle (budget %v, 1 commande seule = %v)", elapsed, n, budget, delay)
	}
	t.Logf("%d commandes différentes traitées en parallèle en %v (délai simulé par commande: %v)", n, elapsed, delay)
}
