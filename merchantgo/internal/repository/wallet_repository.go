package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"merchantgo/internal/models"
)

type WalletRepository interface {
	// FindByOrderAndUser sert l'idempotence de RecordSale — renvoie
	// (nil, nil) si aucune transaction n'existe encore pour ce couple.
	FindByOrderAndUser(ctx context.Context, orderID, userID string) (*models.WalletTransaction, error)
	Create(ctx context.Context, t *models.WalletTransaction) error
	List(ctx context.Context, userID string, page, limit int) ([]models.WalletTransaction, int64, error)
	SumNet(ctx context.Context, userID string) (int64, error)
}

type gormWalletRepository struct {
	db *gorm.DB
}

func NewWalletRepository(db *gorm.DB) WalletRepository {
	return &gormWalletRepository{db: db}
}

func (r *gormWalletRepository) FindByOrderAndUser(ctx context.Context, orderID, userID string) (*models.WalletTransaction, error) {
	var t models.WalletTransaction
	err := r.db.WithContext(ctx).First(&t, "order_id = ? AND user_id = ?", orderID, userID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *gormWalletRepository) Create(ctx context.Context, t *models.WalletTransaction) error {
	return r.db.WithContext(ctx).Create(t).Error
}

func (r *gormWalletRepository) List(ctx context.Context, userID string, page, limit int) ([]models.WalletTransaction, int64, error) {
	var txs []models.WalletTransaction
	var total int64

	base := r.db.WithContext(ctx).Model(&models.WalletTransaction{}).Where("user_id = ?", userID)
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("created_at desc").
		Offset((page - 1) * limit).Limit(limit).
		Find(&txs).Error
	if err != nil {
		return nil, 0, err
	}
	return txs, total, nil
}

func (r *gormWalletRepository) SumNet(ctx context.Context, userID string) (int64, error) {
	var sum int64
	err := r.db.WithContext(ctx).Model(&models.WalletTransaction{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(net_amount), 0)").
		Scan(&sum).Error
	return sum, err
}
