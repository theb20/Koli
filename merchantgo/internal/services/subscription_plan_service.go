package services

import (
	"context"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/utils"
)

type SubscriptionPlanInput struct {
	Slug           string
	Name           string
	MaxProducts    int
	MaxEmployees   int
	MaxOrders      int
	StorageLimitMb int
	CommissionRate float64
	PriceMonthly   int
	PriceYearly    int
	Features       string
	IsActive       bool
	Position       int
}

type SubscriptionPlanService interface {
	List(ctx context.Context, activeOnly bool) ([]models.SubscriptionPlan, error)
	Get(ctx context.Context, id uuid.UUID) (*models.SubscriptionPlan, error)
	Create(ctx context.Context, in SubscriptionPlanInput) (*models.SubscriptionPlan, error)
	Update(ctx context.Context, id uuid.UUID, in SubscriptionPlanInput) (*models.SubscriptionPlan, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type subscriptionPlanService struct {
	repo   repository.SubscriptionPlanRepository
	logger *zap.Logger
}

func NewSubscriptionPlanService(repo repository.SubscriptionPlanRepository, logger *zap.Logger) SubscriptionPlanService {
	return &subscriptionPlanService{repo: repo, logger: logger}
}

func (s *subscriptionPlanService) List(ctx context.Context, activeOnly bool) ([]models.SubscriptionPlan, error) {
	plans, err := s.repo.List(ctx, activeOnly)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	return plans, nil
}

func (s *subscriptionPlanService) Get(ctx context.Context, id uuid.UUID) (*models.SubscriptionPlan, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if p == nil {
		return nil, utils.ErrNotFound("Plan introuvable")
	}
	return p, nil
}

func (s *subscriptionPlanService) Create(ctx context.Context, in SubscriptionPlanInput) (*models.SubscriptionPlan, error) {
	if in.Slug == "" || in.Name == "" {
		return nil, utils.ErrBadRequest("Slug et nom requis", nil)
	}
	existing, err := s.repo.FindBySlug(ctx, in.Slug)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if existing != nil {
		return nil, utils.ErrConflict("Un plan avec ce slug existe déjà")
	}

	p := &models.SubscriptionPlan{
		Slug: in.Slug, Name: in.Name,
		MaxProducts: in.MaxProducts, MaxEmployees: in.MaxEmployees, MaxOrders: in.MaxOrders,
		StorageLimitMb: in.StorageLimitMb, CommissionRate: in.CommissionRate,
		PriceMonthly: in.PriceMonthly, PriceYearly: in.PriceYearly,
		Features: in.Features, IsActive: in.IsActive, Position: in.Position,
	}
	if err := s.repo.Save(ctx, p); err != nil {
		return nil, utils.ErrInternal(err)
	}
	return p, nil
}

func (s *subscriptionPlanService) Update(ctx context.Context, id uuid.UUID, in SubscriptionPlanInput) (*models.SubscriptionPlan, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	if p == nil {
		return nil, utils.ErrNotFound("Plan introuvable")
	}

	if in.Slug != "" && in.Slug != p.Slug {
		conflict, err := s.repo.FindBySlug(ctx, in.Slug)
		if err != nil {
			return nil, utils.ErrInternal(err)
		}
		if conflict != nil {
			return nil, utils.ErrConflict("Un plan avec ce slug existe déjà")
		}
		p.Slug = in.Slug
	}
	if in.Name != "" {
		p.Name = in.Name
	}
	p.MaxProducts = in.MaxProducts
	p.MaxEmployees = in.MaxEmployees
	p.MaxOrders = in.MaxOrders
	p.StorageLimitMb = in.StorageLimitMb
	p.CommissionRate = in.CommissionRate
	p.PriceMonthly = in.PriceMonthly
	p.PriceYearly = in.PriceYearly
	p.Features = in.Features
	p.IsActive = in.IsActive
	p.Position = in.Position

	if err := s.repo.Save(ctx, p); err != nil {
		return nil, utils.ErrInternal(err)
	}
	return p, nil
}

func (s *subscriptionPlanService) Delete(ctx context.Context, id uuid.UUID) error {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return utils.ErrInternal(err)
	}
	if p == nil {
		return utils.ErrNotFound("Plan introuvable")
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return utils.ErrInternal(err)
	}
	return nil
}
