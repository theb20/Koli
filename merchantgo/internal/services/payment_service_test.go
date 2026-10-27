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
}

func (f *fakePaymentRepo) Create(context.Context, *models.PaymentIntent) error {
	f.created++
	return nil
}
func (f *fakePaymentRepo) FindByProviderRef(context.Context, string) (*models.PaymentIntent, error) {
	return nil, nil
}
func (f *fakePaymentRepo) FindPendingByOrderID(context.Context, string) (*models.PaymentIntent, error) {
	return f.pending, nil
}
func (f *fakePaymentRepo) Update(context.Context, *models.PaymentIntent) error { return nil }

// Une tentative en attente pour la même commande et le même montant est
// réutilisée : aucune nouvelle transaction WiniPayer (le client WiniPayer
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
		t.Fatal("WiniPayer non configuré : une nouvelle création devait être tentée (et échouer ici)")
	}
}
