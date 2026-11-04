package services

import (
	"context"

	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/utils"
)

var validPayoutOperators = map[string]bool{
	"orange_money": true, "mtn_money": true, "wave": true, "moov_money": true,
}

type PayoutMethodInput struct {
	Operator string
	Phone    string
}

type PayoutMethodService interface {
	Get(ctx context.Context, userID string) (*models.MerchantPayoutMethod, error)
	Set(ctx context.Context, userID string, in PayoutMethodInput) (*models.MerchantPayoutMethod, error)
}

type payoutMethodService struct {
	repo repository.PayoutMethodRepository
}

func NewPayoutMethodService(repo repository.PayoutMethodRepository) PayoutMethodService {
	return &payoutMethodService{repo: repo}
}

func (s *payoutMethodService) Get(ctx context.Context, userID string) (*models.MerchantPayoutMethod, error) {
	p, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal(err)
	}
	return p, nil // nil = pas encore configuré, pas une erreur
}

func (s *payoutMethodService) Set(ctx context.Context, userID string, in PayoutMethodInput) (*models.MerchantPayoutMethod, error) {
	if !validPayoutOperators[in.Operator] {
		return nil, utils.ErrBadRequest("Opérateur invalide", nil)
	}
	if in.Phone == "" {
		return nil, utils.ErrBadRequest("Numéro requis", nil)
	}

	p := &models.MerchantPayoutMethod{UserID: userID, Operator: in.Operator, Phone: in.Phone}
	if err := s.repo.Upsert(ctx, p); err != nil {
		return nil, utils.ErrInternal(err)
	}
	return s.Get(ctx, userID)
}
