package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"merchantgo/internal/middleware"
	"merchantgo/internal/models"
	"merchantgo/internal/repository"
	"merchantgo/internal/services"
	"merchantgo/internal/utils"
)

type AdminHandler struct {
	service services.ApplicationService
	logger  *zap.Logger
}

func NewAdminHandler(service services.ApplicationService, logger *zap.Logger) *AdminHandler {
	return &AdminHandler{service: service, logger: logger}
}

type listRequest struct {
	Page   int    `form:"page" binding:"omitempty,min=1"`
	Limit  int    `form:"limit" binding:"omitempty,min=1,max=100"`
	Status string `form:"status" binding:"omitempty,oneof=draft submitted pending_review approved rejected"`
}

type listResponse struct {
	Data       []applicationResponse `json:"data"`
	Page       int                   `json:"page"`
	Limit      int                   `json:"limit"`
	Total      int64                 `json:"total"`
	TotalPages int                   `json:"totalPages"`
}

// List godoc
// @Summary Lister les candidatures marchand (admin)
// @Router /api/v1/admin/applications [get]
func (h *AdminHandler) List(c *gin.Context) {
	var req listRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Paramètres de requête invalides", err))
		return
	}
	if req.Page == 0 {
		req.Page = 1
	}
	if req.Limit == 0 {
		req.Limit = 20
	}

	result, err := h.service.List(c.Request.Context(), repository.ListParams{
		Page: req.Page, Limit: req.Limit, Status: models.Status(req.Status),
	})
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	data := make([]applicationResponse, len(result.Applications))
	for i := range result.Applications {
		data[i] = toApplicationResponse(&result.Applications[i])
	}

	c.JSON(http.StatusOK, listResponse{
		Data: data, Page: result.Page, Limit: result.Limit, Total: result.Total, TotalPages: result.TotalPages,
	})
}

type idURI struct {
	ID string `uri:"id" binding:"required,uuid"`
}

func parseApplicationID(c *gin.Context) (uuidValue, error) {
	var req idURI
	if err := c.ShouldBindUri(&req); err != nil {
		return uuidValue{}, utils.ErrBadRequest("ID de candidature invalide", err)
	}
	id, err := parseUUID(req.ID)
	if err != nil {
		return uuidValue{}, utils.ErrBadRequest("ID de candidature invalide", err)
	}
	return uuidValue{id}, nil
}

// Get godoc
// @Summary Détail d'une candidature (admin)
// @Router /api/v1/admin/applications/{id} [get]
func (h *AdminHandler) Get(c *gin.Context) {
	id, err := parseApplicationID(c)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	app, err := h.service.Get(c.Request.Context(), id.UUID)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, toApplicationResponse(app))
}

type decisionRequest struct {
	Note   string `json:"note"`
	Reason string `json:"reason"`
}

// Approve godoc
// @Summary Approuver une candidature (admin)
// @Router /api/v1/admin/applications/{id}/approve [post]
func (h *AdminHandler) Approve(c *gin.Context) {
	id, err := parseApplicationID(c)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	var req decisionRequest
	_ = c.ShouldBindJSON(&req)

	app, err := h.service.Approve(c.Request.Context(), id.UUID, adminActorID(c), req.Note)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, toApplicationResponse(app))
}

// Reject godoc
// @Summary Rejeter une candidature (admin)
// @Router /api/v1/admin/applications/{id}/reject [post]
func (h *AdminHandler) Reject(c *gin.Context) {
	id, err := parseApplicationID(c)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	var req decisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Corps de requête invalide", err))
		return
	}

	app, err := h.service.Reject(c.Request.Context(), id.UUID, adminActorID(c), req.Reason)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, toApplicationResponse(app))
}

// adminActorID identifie l'acteur admin pour l'audit trail — koli-admin
// s'authentifie par clé de service (pas de compte utilisateur individuel
// côté ce service), donc l'identité fine reste "admin-service" par défaut,
// ou l'ID transmis explicitement en en-tête si koli-admin le fournit.
func adminActorID(c *gin.Context) string {
	if id := c.GetHeader("X-Admin-Id"); id != "" {
		return id
	}
	return "admin-service"
}
