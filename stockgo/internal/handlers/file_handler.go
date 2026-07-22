package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"stockgo/internal/middleware"
	"stockgo/internal/models"
	"stockgo/internal/repository"
	"stockgo/internal/services"
	"stockgo/internal/utils"
)

type FileHandler struct {
	service   services.FileService
	publicURL string
	logger    *zap.Logger
}

func NewFileHandler(service services.FileService, publicURL string, logger *zap.Logger) *FileHandler {
	registerCustomValidators()
	return &FileHandler{service: service, publicURL: publicURL, logger: logger}
}

// uploadRequest borne les champs non-fichier du formulaire d'upload — un
// schéma explicite plutôt que de lire c.PostForm(...) en brut, avec rejet
// 400 dès la frontière HTTP si "visibility" n'est pas une valeur attendue
// ou si "bucket" contient autre chose que des caractères sûrs.
type uploadRequest struct {
	Bucket     string `form:"bucket" binding:"omitempty,bucketname"`
	Visibility string `form:"visibility" binding:"omitempty,oneof=public private"`
}

// listRequest borne les paramètres de requête de GET /files — mêmes règles
// que celles déjà appliquées plus bas (repository.sortableColumns,
// validation.ValidateBucket), mais vérifiées explicitement à la frontière
// pour renvoyer une erreur 400 claire plutôt que de silencieusement
// retomber sur une valeur par défaut.
type listRequest struct {
	Page     int    `form:"page" binding:"omitempty,min=1"`
	Limit    int    `form:"limit" binding:"omitempty,min=1,max=100"`
	Search   string `form:"search" binding:"omitempty,max=255"`
	SortBy   string `form:"sort_by" binding:"omitempty,oneof=created_at size original_name"`
	SortDir  string `form:"sort_dir" binding:"omitempty,oneof=asc desc"`
	MimeType string `form:"mime_type" binding:"omitempty,max=255"`
	Bucket   string `form:"bucket" binding:"omitempty,bucketname"`
}

type fileResponse struct {
	ID        string `json:"id"`
	Filename  string `json:"filename"`
	Size      int64  `json:"size"`
	Mime      string `json:"mime"`
	URL       string `json:"url"`
	CreatedAt string `json:"created_at"`
}

func (h *FileHandler) toResponse(f *models.File) fileResponse {
	return fileResponse{
		ID:        f.ID.String(),
		Filename:  f.OriginalName,
		Size:      f.Size,
		Mime:      f.MimeType,
		URL:       fmt.Sprintf("%s/api/v1/files/%s", h.publicURL, f.ID.String()),
		CreatedAt: f.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// Upload godoc
// @Summary      Uploader un fichier
// @Description  Upload multipart/form-data (image, vidéo, pdf, document, zip, audio)
// @Tags         files
// @Accept       multipart/form-data
// @Produce      json
// @Param        file      formData  file    true   "Fichier à uploader"
// @Param        bucket    formData  string  false  "Dossier logique de destination (ex: products, avatars)"
// @Param        visibility formData string  false  "public ou private (défaut: private)"
// @Security     ApiKeyAuth
// @Success      201  {object}  fileResponse
// @Failure      400  {object}  map[string]interface{}
// @Router       /api/v1/files [post]
func (h *FileHandler) Upload(c *gin.Context) {
	var req uploadRequest
	if err := c.ShouldBind(&req); err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Paramètres de formulaire invalides", err))
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrBadRequest("Champ 'file' manquant ou invalide", err))
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		middleware.RespondError(c, h.logger, utils.ErrInternal(err))
		return
	}
	defer f.Close()

	mimeType := fileHeader.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	ownerID, _ := c.Get(middleware.ContextOwnerIDKey)

	input := services.UploadInput{
		Reader:       f,
		OriginalName: fileHeader.Filename,
		DeclaredSize: fileHeader.Size,
		MimeType:     mimeType,
		Bucket:       req.Bucket,
		OwnerID:      fmt.Sprintf("%v", ownerID),
		Visibility:   models.Visibility(req.Visibility),
	}

	file, err := h.service.Upload(c.Request.Context(), input)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusCreated, h.toResponse(file))
}

// Download godoc
// @Summary      Télécharger un fichier
// @Tags         files
// @Produce      application/octet-stream
// @Param        id   path  string  true  "ID du fichier"
// @Security     ApiKeyAuth
// @Success      200  {file}    binary
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/files/{id} [get]
func (h *FileHandler) Download(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	// Un fichier "private" exige une authentification réussie (vérifiée par
	// OptionalAuth en amont, sans avoir bloqué la requête) ; un fichier
	// "public" est servi à quiconque, authentifié ou non — c'est tout
	// l'intérêt de ce champ.
	meta, err := h.service.GetInfo(c.Request.Context(), id)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	if meta.Visibility != models.VisibilityPublic && !middleware.IsAuthenticated(c) {
		middleware.RespondError(c, h.logger, utils.ErrUnauthorized("Authentification requise pour ce fichier privé"))
		return
	}

	reader, file, err := h.service.Download(c.Request.Context(), id)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}
	defer reader.Close()

	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, file.OriginalName))
	c.Header("X-Checksum-SHA256", file.ChecksumSHA256)
	c.DataFromReader(http.StatusOK, file.Size, file.MimeType, reader, nil)
}

type infoResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Size      int64  `json:"size"`
	Mime      string `json:"mime"`
	Extension string `json:"extension"`
	Checksum  string `json:"checksum_sha256"`
	CreatedAt string `json:"created_at"`
}

// Info godoc
// @Summary      Métadonnées d'un fichier
// @Tags         files
// @Produce      json
// @Param        id   path  string  true  "ID du fichier"
// @Security     ApiKeyAuth
// @Success      200  {object}  infoResponse
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/files/{id}/info [get]
func (h *FileHandler) Info(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	file, err := h.service.GetInfo(c.Request.Context(), id)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, infoResponse{
		ID:        file.ID.String(),
		Name:      file.OriginalName,
		Size:      file.Size,
		Mime:      file.MimeType,
		Extension: file.Extension,
		Checksum:  file.ChecksumSHA256,
		CreatedAt: file.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	})
}

// Delete godoc
// @Summary      Supprimer un fichier
// @Tags         files
// @Produce      json
// @Param        id   path  string  true  "ID du fichier"
// @Security     ApiKeyAuth
// @Success      200  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/files/{id} [delete]
func (h *FileHandler) Delete(c *gin.Context) {
	id, err := parseUUID(c)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Fichier supprimé"})
}

type listResponse struct {
	Data       []fileResponse `json:"data"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	Total      int64          `json:"total"`
	TotalPages int            `json:"total_pages"`
}

// List godoc
// @Summary      Lister les fichiers
// @Tags         files
// @Produce      json
// @Param        page      query  int     false  "Page (défaut 1)"
// @Param        limit     query  int     false  "Résultats par page (défaut 20, max 100)"
// @Param        search    query  string  false  "Recherche sur le nom original"
// @Param        sort_by   query  string  false  "created_at | size | original_name"
// @Param        sort_dir  query  string  false  "asc | desc"
// @Param        mime_type query  string  false  "Filtre par type MIME exact"
// @Param        bucket    query  string  false  "Filtre par bucket"
// @Security     ApiKeyAuth
// @Success      200  {object}  listResponse
// @Router       /api/v1/files [get]
func (h *FileHandler) List(c *gin.Context) {
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

	params := repository.ListParams{
		Page:     req.Page,
		Limit:    req.Limit,
		Search:   req.Search,
		SortBy:   req.SortBy,
		SortDir:  req.SortDir,
		MimeType: req.MimeType,
		Bucket:   req.Bucket,
	}

	result, err := h.service.List(c.Request.Context(), params)
	if err != nil {
		middleware.RespondError(c, h.logger, err)
		return
	}

	data := make([]fileResponse, len(result.Files))
	for i := range result.Files {
		data[i] = h.toResponse(&result.Files[i])
	}

	c.JSON(http.StatusOK, listResponse{
		Data:       data,
		Page:       result.Page,
		Limit:      result.Limit,
		Total:      result.Total,
		TotalPages: result.TotalPages,
	})
}

// idURI est le schéma explicite du paramètre de chemin ":id" — validé par
// le même mécanisme de binding que les autres entrées (uploadRequest,
// listRequest), plutôt que par un uuid.Parse ad hoc. Fonctionnellement
// équivalent (uuid.Parse validait déjà correctement le format), mais garde
// une frontière de validation homogène sur toutes les routes.
type idURI struct {
	ID string `uri:"id" binding:"required,uuid"`
}

func parseUUID(c *gin.Context) (uuid.UUID, error) {
	var req idURI
	if err := c.ShouldBindUri(&req); err != nil {
		return uuid.Nil, utils.ErrBadRequest("ID de fichier invalide", err)
	}
	return uuid.MustParse(req.ID), nil
}
