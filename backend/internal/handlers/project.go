package handlers

import (
	"context"
	"net/http"
	"task-tracker/internal/apperr"
	"task-tracker/internal/models"
	"task-tracker/internal/repository"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type ProjectHandler struct {
	repo *repository.ProjectRepo
}

func NewProjectHandler(repo *repository.ProjectRepo) *ProjectHandler {
	return &ProjectHandler{repo: repo}
}

func (h *ProjectHandler) Create(c *gin.Context) {
	var body struct {
		Name        string     `json:"name" binding:"required,min=1,max=255"`
		Description string     `json:"description"`
		StartDate   *time.Time `json:"start_date"`
		EndDate     *time.Time `json:"end_date"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, apperr.Validation(err.Error()))
		return
	}
	p := &models.Project{
		ID:             uuid.NewString(),
		OrganizationID: currentOrgID(c),
		Name:           body.Name,
		Description:    body.Description,
		StartDate:      body.StartDate,
		EndDate:        body.EndDate,
		CreatedByID:    currentUserID(c),
	}
	if err := h.repo.Create(context.Background(), p); err != nil {
		respondErr(c, apperr.Internal())
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *ProjectHandler) List(c *gin.Context) {
	projects, err := h.repo.ListByOrg(c.Request.Context(), currentOrgID(c))
	if err != nil {
		respondErr(c, apperr.Internal())
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": projects})
}

func (h *ProjectHandler) Delete(c *gin.Context) {
	_, err := h.repo.GetByID(c.Request.Context(), c.Param("id"), currentOrgID(c))
	if err != nil {
		if err == pgx.ErrNoRows {
			respondErr(c, apperr.NotFound("project"))
		} else {
			respondErr(c, apperr.Internal())
		}
		return
	}
	if err := h.repo.Delete(c.Request.Context(), c.Param("id"), currentOrgID(c)); err != nil {
		respondErr(c, apperr.Internal())
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
