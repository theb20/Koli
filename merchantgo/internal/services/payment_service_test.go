package services

import (
	"context"
	"testing"

	"go.uber.org/zap"

	"merchantgo/internal/config"
	"merchantgo/internal/models"
)

type fakePaymentRepo struct {
	pending *models.PaymentIntent
	created int
	byRef   map[string]*models.PaymentIntent
}

func (f *fakePaymentRepo) Create(context.Context, *models.PaymentIntent) error {
	f.created++
	return nil
}
func (f *fakePaymentRepo) FindByProviderRef(_ context.Context, ref string) (*models.PaymentIntent, error) {
	return f.byRef[ref], nil
}
func (f *fakePaymentRepo) FindPendingByOrderID(context.Context, string) (*models.PaymentIntent, error) {
	return f.pending, nil
}
func (f *fakePaymentRepo) Update(context.Context, *models.PaymentIntent) error { return nil }

// Une tentative en attente pour la même commande et le même montant est
// réutilisée : aucune nouvelle transaction GeniusPay (le client GeniusPay
// n'est même pas configuré ici — l'atteindre ferait échouer le test).
func TestCreatePaymentReusesPendingIntent(t *testing.T) {
	pending := &models.PaymentIntent{OrderID: "o1", Amount: 10000, ProviderRef: "ref-1", CheckoutURL: "https://pay/1", State: models.PaymentPending}
	repo := &fakePaymentRepo{pending: pending}
	svc := NewPaymentService(repo, &config.Config{}, nil, zap.NewNop())
	got, err := svc.CreatePayment(context.Background(), CreatePaymentInput{OrderID: "o1", Amount: 10000})
	if err != nil || got.ProviderRef != "ref-1" || repo.created != 0 {
		t.Fatalf("réutilisation attendue: ref=%v err=%v created=%d", got, err, repo.created)
	}
}

// Montant différent (commande modifiée) → nouvelle tentative, pas le vieux lien.
func TestCreatePaymentNewIntentWhenAmountDiffers(t *testing.T) {
	repo := &fakePaymentRepo{pending: &models.PaymentIntent{OrderID: "o1", Amount: 5000, CheckoutURL: "https://pay/1"}}
	svc := NewPaymentService(repo, &config.Config{}, nil, zap.NewNop())
	if _, err := svc.CreatePayment(context.Background(), CreatePaymentInput{OrderID: "o1", Amount: 10000}); err == nil {
		t.Fatal("GeniusPay non configuré : une nouvelle création devait être tentée (et échouer ici)")
	}
}

// ConfirmPayment doit revérifier chaque intent auprès du FOURNISSEUR
// enregistré sur l'intent lui-même (Provider), jamais un seul client fixe —
// sans ça, une transaction WiniPayer encore en attente au moment de la
// bascule vers GeniusPay serait vérifiée auprès du mauvais fournisseur.
func TestConfirmPaymentFailsCleanlyWhenProviderUnconfigured(t *testing.T) {
	repo := &fakePaymentRepo{}
	repo.byRef = map[string]*models.PaymentIntent{
		"gp-1": {ProviderRef: "gp-1", Provider: models.ProviderGeniusPay, OrderID: "o1", State: models.PaymentPending},
		"wp-1": {ProviderRef: "wp-1", Provider: models.ProviderWinipayer, OrderID: "o2", State: models.PaymentPending},
	}
	svc := NewPaymentService(repo, &config.Config{}, nil, zap.NewNop())

	if _, err := svc.ConfirmPayment(context.Background(), "gp-1"); err == nil {
		t.Fatal("GeniusPay non configuré : erreur attendue, pas un succès simulé")
	}
	if _, err := svc.ConfirmPayment(context.Background(), "wp-1"); err == nil {
		t.Fatal("WiniPayer non configuré : erreur attendue, pas un succès simulé")
	}
}

// Un fournisseur déjà dans un état terminal ne doit plus jamais rappeler le
// client externe (webhook rejoué) — même sans aucun fournisseur configuré,
// ça ne doit PAS échouer : l'état connu est renvoyé tel quel.
func TestConfirmPaymentTerminalStateNeverCallsProviderAgain(t *testing.T) {
	repo := &fakePaymentRepo{}
	repo.byRef = map[string]*models.PaymentIntent{
		"gp-done": {ProviderRef: "gp-done", Provider: models.ProviderGeniusPay, OrderID: "o1", State: models.PaymentSuccess},
	}
	svc := NewPaymentService(repo, &config.Config{}, nil, zap.NewNop())
	got, err := svc.ConfirmPayment(context.Background(), "gp-done")
	if err != nil || got.State != models.PaymentSuccess {
		t.Fatalf("état terminal attendu sans appel fournisseur: got=%v err=%v", got, err)
	}
}
