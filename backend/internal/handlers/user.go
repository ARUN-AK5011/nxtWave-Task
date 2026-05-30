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

// ListMembers is the admin-only endpoint returning full user records.
func (h *UserHandler) ListMembers(c *gin.Context) {
	users, err := h.repo.ListByOrg(c.Request.Context(), currentOrgID(c))
	if err != nil {
		respondErr(c, apperr.Internal())
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users})
}

// OrgMembers returns basic user info for all org members, accessible to all
// authenticated users (used for the assignee picker).
func (h *UserHandler) OrgMembers(c *gin.Context) {
	users, err := h.repo.ListByOrg(c.Request.Context(), currentOrgID(c))
	if err != nil {
		respondErr(c, apperr.Internal())
		return
	}
	basic := make([]models.UserBasic, 0, len(users))
	for _, u := range users {
		basic = append(basic, models.UserBasic{
			ID:    u.ID,
			Name:  u.Name,
			Email: u.Email,
			Role:  u.Role,
		})
	}
	c.JSON(http.StatusOK, gin.H{"data": basic})
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
