package handlers

import (
	"net/http"
	"task-tracker/internal/apperr"
	"task-tracker/internal/models"
	"task-tracker/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type UserHandler struct {
	repo *repository.UserRepo
}

func NewUserHandler(repo *repository.UserRepo) *UserHandler {
	return &UserHandler{repo: repo}
}

func (h *UserHandler) ListMembers(c *gin.Context) {
	users, err := h.repo.ListByOrg(c.Request.Context(), currentOrgID(c))
	if err != nil {
		respondErr(c, apperr.Internal())
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users})
}

func (h *UserHandler) UpdateRole(c *gin.Context) {
	var body struct {
		Role string `json:"role" binding:"required,oneof=ADMIN MANAGER MEMBER"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, apperr.Validation(err.Error()))
		return
	}
	targetID := c.Param("id")
	target, err := h.repo.GetByID(c.Request.Context(), targetID)
	if err != nil {
		if err == pgx.ErrNoRows {
			respondErr(c, apperr.NotFound("user"))
		} else {
			respondErr(c, apperr.Internal())
		}
		return
	}
	if target.OrganizationID != currentOrgID(c) {
		respondErr(c, apperr.Forbidden())
		return
	}
	if err := h.repo.UpdateRole(c.Request.Context(), targetID, models.Role(body.Role)); err != nil {
		respondErr(c, apperr.Internal())
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "role updated"})
}

func (h *UserHandler) Me(c *gin.Context) {
	user, err := h.repo.GetByID(c.Request.Context(), currentUserID(c))
	if err != nil {
		respondErr(c, apperr.Internal())
		return
	}
	c.JSON(http.StatusOK, user)
}
