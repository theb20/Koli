package services

import (
	"context"
	"math"

	"go.uber.org/zap"

	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/utils"
)

type RecordSaleInput struct {
	UserID      string
	OrderID     string
	OrderNumber string
	GrossAmount int // part de CE marchand dans la commande, pas le total
}

type RecordRefundInput struct {
	UserID      string
	OrderID     string
	OrderNumber string
	ReturnID    string // clé d'idempotence — pas OrderID, voir models.WalletTransaction
	GrossAmount int    // part de CE marchand sur les articles RETOURNÉS, pas toute la commande
}

type WalletService interface {
	// RecordSale calcule et enregistre la commission d'une vente réglée —
	// idempotent : un appel répété pour le même (OrderID, UserID) renvoie la
	// transaction déjà créée au lieu d'en créer une seconde (voir
	// wallet_repository.go, index unique).
	RecordSale(ctx context.Context, in RecordSaleInput) (*models.WalletTransaction, error)
	// RecordRefund reprend (NetAmount négatif, même commission que la vente
	// d'origine) la part d'un marchand sur un retour remboursé — idempotent
	// par (ReturnID, UserID), jamais OrderID seul (plusieurs retours
	// possibles pour une même commande).
	RecordRefund(ctx context.Context, in RecordRefundInput) (*models.WalletTransaction, error)
	Balance(ctx context.Context, userID string) (int64, error)
	List(ctx context.Context, userID string, page, limit int) ([]models.WalletTransaction, int64, error)
}

type walletService struct {
	walletRepo repository.WalletRepository
	billingSvc BillingService
	logger     *zap.Logger
}

func NewWalletService(walletRepo repository.WalletRepository, billingSvc BillingService, logger *zap.Logger) WalletService {
	return &walletService{walletRepo: walletRepo, billingSvc: billingSvc, logger: logger}
}

func (s *walletService) RecordSale(ctx context.Context, in RecordSaleInput) (*models.WalletTransaction, error) {
	if in.GrossAmount <= 0 {
		return nil, utils.ErrBadRequest("Montant invalide", nil)
	}

	existing, err := s.walletRepo.FindByRefAndUser(ctx, in.OrderID, in.UserID)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if existing != nil {
		s.logger.Info("vente déjà enregistrée, appel idempotent ignoré",
			zap.String("order_id", in.OrderID), zap.String("user_id", in.UserID))
		return existing, nil
	}

	billing, err := s.billingSvc.Get(ctx, in.UserID)
	if err != nil {
		return nil, err
	}

	// En mode abonnement, c'est le taux du plan qui s'applique (souvent 0 —
	// le marchand a déjà payé l'abonnement) ; en mode commission, le taux
	// personnel choisi par le marchand.
	rate := billing.CommissionRate
	if billing.Mode == models.BillingModeSubscription {
		rate = 0
		if billing.SubscriptionPlan != nil {
			rate = billing.SubscriptionPlan.CommissionRate
		}
	}

	commission := int(math.Round(float64(in.GrossAmount) * rate / 100))
	net := in.GrossAmount - commission

	tx := &models.WalletTransaction{
		UserID:           in.UserID,
		Type:             models.TransactionSale,
		RefID:            in.OrderID,
		OrderID:          in.OrderID,
		OrderNumber:      in.OrderNumber,
		GrossAmount:      in.GrossAmount,
		CommissionRate:   rate,
		CommissionAmount: commission,
		NetAmount:        net,
		BillingMode:      billing.Mode,
	}

	if err := s.walletRepo.Create(ctx, tx); err != nil {
		// Concurrence : deux appels quasi simultanés pour la même commande —
		// l'index unique côté DB a tranché, on relit la ligne gagnante
		// plutôt que de renvoyer une erreur pour un cas déjà géré.
		if again, findErr := s.walletRepo.FindByRefAndUser(ctx, in.OrderID, in.UserID); findErr == nil && again != nil {
			return again, nil
		}
		return nil, utils.ErrInternal(err)
	}

	return tx, nil
}

// RecordRefund reprend la part d'un marchand sur les articles d'un retour
// remboursé — même logique de commission que RecordSale (taux CURRENT du
// marchand, pas celui en vigueur au moment de la vente d'origine : même
// choix de simplicité que RecordSale, qui ne verrouille pas non plus le
// taux historique). NetAmount est toujours négatif ou nul, jamais positif.
func (s *walletService) RecordRefund(ctx context.Context, in RecordRefundInput) (*models.WalletTransaction, error) {
	if in.GrossAmount <= 0 {
		return nil, utils.ErrBadRequest("Montant invalide", nil)
	}

	existing, err := s.walletRepo.FindByRefAndUser(ctx, in.ReturnID, in.UserID)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if existing != nil {
		s.logger.Info("remboursement déjà enregistré, appel idempotent ignoré",
			zap.String("return_id", in.ReturnID), zap.String("user_id", in.UserID))
		return existing, nil
	}

	billing, err := s.billingSvc.Get(ctx, in.UserID)
	if err != nil {
		return nil, err
	}

	rate := billing.CommissionRate
	if billing.Mode == models.BillingModeSubscription {
		rate = 0
		if billing.SubscriptionPlan != nil {
			rate = billing.SubscriptionPlan.CommissionRate
		}
	}

	commission := int(math.Round(float64(in.GrossAmount) * rate / 100))
	net := in.GrossAmount - commission

	tx := &models.WalletTransaction{
		UserID:           in.UserID,
		Type:             models.TransactionRefund,
		RefID:            in.ReturnID,
		OrderID:          in.OrderID,
		OrderNumber:      in.OrderNumber,
		GrossAmount:      -in.GrossAmount,
		CommissionRate:   rate,
		CommissionAmount: -commission,
		NetAmount:        -net,
		BillingMode:      billing.Mode,
	}

	if err := s.walletRepo.Create(ctx, tx); err != nil {
		if again, findErr := s.walletRepo.FindByRefAndUser(ctx, in.ReturnID, in.UserID); findErr == nil && again != nil {
			return again, nil
		}
		return nil, utils.ErrInternal(err)
	}

	return tx, nil
}

func (s *walletService) Balance(ctx context.Context, userID string) (int64, error) {
	sum, err := s.walletRepo.SumNet(ctx, userID)
	if err != nil {
		return 0, utils.ErrInternal(err)
	}
	return sum, nil
}

func (s *walletService) List(ctx context.Context, userID string, page, limit int) ([]models.WalletTransaction, int64, error) {
	txs, total, err := s.walletRepo.List(ctx, userID, page, limit)
	if err != nil {
		return nil, 0, utils.ErrInternal(err)
	}
	return txs, total, nil
}
