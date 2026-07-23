package services

import (
	"context"
	"errors"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"merchantgo/internal/didit"
	"merchantgo/internal/models"
	"merchantgo/internal/repository"
)

// KycService traite les webhooks Didit. La signature et la fraîcheur de
// l'horodatage sont déjà vérifiées par le handler HTTP avant d'arriver
// ici — ce service ne s'occupe que de l'idempotence et de la mise à jour
// métier, indépendamment du transport.
type KycService interface {
	ProcessWebhook(ctx context.Context, payload didit.WebhookPayload, rawBody []byte) error
}

type kycService struct {
	events repository.DiditEventRepository
	apps   repository.ApplicationRepository
	logger *zap.Logger
}

func NewKycService(events repository.DiditEventRepository, apps repository.ApplicationRepository, logger *zap.Logger) KycService {
	return &kycService{events: events, apps: apps, logger: logger}
}

func (s *kycService) ProcessWebhook(ctx context.Context, payload didit.WebhookPayload, rawBody []byte) error {
	event := &models.DiditWebhookEvent{
		EventID:     payload.EventID,
		SessionID:   payload.SessionID,
		WebhookType: payload.WebhookType,
		Status:      payload.Status,
		VendorData:  payload.VendorData,
		RawPayload:  string(rawBody),
	}
	if err := s.events.Create(ctx, event); err != nil {
		if errors.Is(err, repository.ErrDuplicateEvent) {
			s.logger.Info("webhook Didit dupliqué ignoré", zap.String("event_id", payload.EventID))
			return nil
		}
		return err
	}

	// Seuls les événements de statut d'une session KYC individuelle ont une
	// logique métier ici — les autres familles (business.*, transaction.*,
	// travel_rule.*, activity.created...) sont déjà journalisées ci-dessus
	// pour l'audit/debug, mais hors périmètre de l'onboarding marchand.
	if payload.WebhookType != didit.WebhookTypeStatusUpdated || payload.SessionKind == didit.SessionKindBusiness {
		return nil
	}
	if payload.VendorData == "" {
		s.logger.Warn("webhook Didit status.updated sans vendor_data — probablement un test depuis le Console",
			zap.String("session_id", payload.SessionID))
		return nil
	}

	app, err := s.apps.FindByUserID(ctx, payload.VendorData)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Warn("webhook Didit pour un vendor_data sans candidature correspondante",
				zap.String("vendor_data", payload.VendorData))
			return nil
		}
		return err
	}

	now := time.Now()
	app.DiditSessionID = payload.SessionID
	app.DiditStatus = payload.Status
	app.DiditEnvironment = payload.Environment
	app.DiditUpdatedAt = &now
	if len(payload.Decision) > 0 {
		app.DiditDecision = string(payload.Decision)
	}

	if err := s.apps.Save(ctx, app); err != nil {
		return err
	}

	s.logger.Info("statut KYC Didit mis à jour",
		zap.String("user_id", payload.VendorData),
		zap.String("session_id", payload.SessionID),
		zap.String("status", payload.Status),
	)
	return nil
}
