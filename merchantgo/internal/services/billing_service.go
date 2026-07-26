package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/utils"
)

// DefaultCommissionRate s'applique à tout marchand qui n'a pas encore
// choisi de modèle économique — un marchand fraîchement approuvé peut
// vendre immédiatement, la commission ne doit jamais être indéfinie.
const DefaultCommissionRate = 5.0

type BillingChoiceInput struct {
	Mode               models.BillingMode
	CommissionRate     *float64 // optionnel, mode=commission uniquement — sinon DefaultCommissionRate
	SubscriptionPlanID *uuid.UUID
}

type BillingService interface {
	// Get renvoie le choix économique du marchand, ou un MerchantBilling
	// "virtuel" non persisté (mode commission, taux par défaut) s'il n'a
	// encore rien choisi — jamais nil, pour que l'appelant n'ait pas à
	// gérer un cas particulier.
	Get(ctx context.Context, userID string) (*models.MerchantBilling, error)
	Choose(ctx context.Context, userID string, in BillingChoiceInput, lockDays int) (*models.MerchantBilling, error)
	// GetBulk renvoie le choix économique de chaque userID demandé — vue
	// admin (koli-admin affiche le plan de chaque marchand dans sa liste).
	// Comme Get, un userID sans choix persisté obtient l'entrée virtuelle
	// par défaut plutôt que d'être absent de la map.
	GetBulk(ctx context.Context, userIDs []string) (map[string]*models.MerchantBilling, error)
}

type billingService struct {
	billingRepo repository.BillingRepository
	planRepo    repository.SubscriptionPlanRepository
	logger      *zap.Logger
}

func NewBillingService(billingRepo repository.BillingRepository, planRepo repository.SubscriptionPlanRepository, logger *zap.Logger) BillingService {
	return &billingService{billingRepo: billingRepo, planRepo: planRepo, logger: logger}
}

func (s *billingService) Get(ctx context.Context, userID string) (*models.MerchantBilling, error) {
	b, err := s.billingRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if b == nil {
		return &models.MerchantBilling{
			UserID:         userID,
			Mode:           models.BillingModeCommission,
			CommissionRate: DefaultCommissionRate,
		}, nil
	}
	return b, nil
}

func (s *billingService) GetBulk(ctx context.Context, userIDs []string) (map[string]*models.MerchantBilling, error) {
	found, err := s.billingRepo.FindByUserIDs(ctx, userIDs)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}

	byUserID := make(map[string]*models.MerchantBilling, len(found))
	for i := range found {
		byUserID[found[i].UserID] = &found[i]
	}

	result := make(map[string]*models.MerchantBilling, len(userIDs))
	for _, id := range userIDs {
		if b, ok := byUserID[id]; ok {
			result[id] = b
			continue
		}
		result[id] = &models.MerchantBilling{
			UserID:         id,
			Mode:           models.BillingModeCommission,
			CommissionRate: DefaultCommissionRate,
		}
	}
	return result, nil
}

func (s *billingService) Choose(ctx context.Context, userID string, in BillingChoiceInput, lockDays int) (*models.MerchantBilling, error) {
	if in.Mode != models.BillingModeCommission && in.Mode != models.BillingModeSubscription {
		return nil, utils.ErrBadRequest("Mode invalide (commission ou subscription)", nil)
	}

	existing, err := s.billingRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if existing != nil && !existing.CanChange(lockDays) {
		return nil, utils.ErrForbidden("Le modèle économique ne peut être changé qu'une fois tous les 30 jours — contactez un administrateur pour une exception")
	}

	rate := DefaultCommissionRate
	if in.CommissionRate != nil {
		if *in.CommissionRate < 0 || *in.CommissionRate > 100 {
			return nil, utils.ErrBadRequest("Taux de commission invalide (0-100)", nil)
		}
		rate = *in.CommissionRate
	}

	var planID *uuid.UUID
	if in.Mode == models.BillingModeSubscription {
		if in.SubscriptionPlanID == nil {
			return nil, utils.ErrBadRequest("Un plan d'abonnement est requis en mode subscription", nil)
		}
		plan, err := s.planRepo.FindByID(ctx, *in.SubscriptionPlanID)
		if err != nil {
			return nil, utils.ErrInternal(err)
		}
		if plan == nil || !plan.IsActive {
			return nil, utils.ErrBadRequest("Plan d'abonnement introuvable ou inactif", nil)
		}
		planID = in.SubscriptionPlanID
	}

	b := existing
	if b == nil {
		b = &models.MerchantBilling{UserID: userID}
	}
	b.Mode = in.Mode
	b.CommissionRate = rate
	b.SubscriptionPlanID = planID
	b.LastChangedAt = time.Now()

	if err := s.billingRepo.Save(ctx, b); err != nil {
		return nil, utils.ErrInternal(err)
	}

	reloaded, err := s.billingRepo.FindByUserID(ctx, userID)
	if err != nil || reloaded == nil {
		return b, nil // sauvegarde réussie, le reload (avec Preload plan) est secondaire
	}
	return reloaded, nil
}
