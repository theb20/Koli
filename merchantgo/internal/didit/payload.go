package didit

import "encoding/json"

// Familles d'événements Didit — il n'existe pas de wildcard côté Didit,
// chaque destination de webhook doit lister explicitement celles qu'elle
// veut recevoir (cf. destination.subscribed_events dans le Business
// Console). Seul WebhookTypeStatusUpdated a une logique métier dans ce
// service ; les autres sont journalisées mais pas traitées, hors périmètre
// de l'onboarding marchand (KYC individuel).
const (
	WebhookTypeStatusUpdated            = "status.updated"
	WebhookTypeDataUpdated              = "data.updated"
	WebhookTypeUserStatusUpdated        = "user.status.updated"
	WebhookTypeUserDataUpdated          = "user.data.updated"
	WebhookTypeBusinessStatusUpdated    = "business.status.updated"
	WebhookTypeBusinessDataUpdated      = "business.data.updated"
	WebhookTypeActivityCreated          = "activity.created"
	WebhookTypeTransactionCreated       = "transaction.created"
	WebhookTypeTransactionStatusUpdated = "transaction.status.updated"
	WebhookTypeTravelRuleStatusUpdated  = "travel_rule.status.updated"
)

// Statuts de session Didit — chaînes exactes, sensibles à la casse
// ("Kyc Expired" avec un seul K majuscule). Distinct de models.Status (le
// statut du dossier de candidature marchand dans ce service).
const (
	StatusApproved     = "Approved"
	StatusDeclined     = "Declined"
	StatusInReview     = "In Review"
	StatusInProgress   = "In Progress"
	StatusNotStarted   = "Not Started"
	StatusAbandoned    = "Abandoned"
	StatusExpired      = "Expired"
	StatusKycExpired   = "Kyc Expired"
	StatusResubmitted  = "Resubmitted"
	StatusAwaitingUser = "Awaiting User"
)

// SessionKindBusiness marque un événement KYB (vérification d'entreprise)
// plutôt qu'une session KYC individuelle — hors périmètre ici.
const SessionKindBusiness = "business"

// WebhookPayload est l'enveloppe complète envoyée par Didit pour un
// événement de session (status.updated / data.updated). Les champs non
// pertinents pour l'onboarding marchand (business_session_id,
// sandbox_scenario...) sont conservés pour ne pas perdre d'information à
// la désérialisation, même si ce service ne les exploite pas tous.
type WebhookPayload struct {
	EventID           string          `json:"event_id"`
	SessionID         string          `json:"session_id"`
	BusinessSessionID string          `json:"business_session_id,omitempty"`
	SessionKind       string          `json:"session_kind,omitempty"`
	Status            string          `json:"status"`
	WebhookType       string          `json:"webhook_type"`
	CreatedAt         int64           `json:"created_at"`
	Timestamp         int64           `json:"timestamp"`
	ApplicationID     string          `json:"application_id"`
	Environment       string          `json:"environment"`
	SandboxScenario   *string         `json:"sandbox_scenario,omitempty"`
	WorkflowID        string          `json:"workflow_id"`
	WorkflowVersion   int             `json:"workflow_version"`
	VendorData        string          `json:"vendor_data"`
	Metadata          json.RawMessage `json:"metadata,omitempty"`
	Decision          json.RawMessage `json:"decision,omitempty"`
}
