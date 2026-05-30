package handlers

import (
	"net/http"
	"task-tracker/internal/apperr"
	"task-tracker/internal/services"

	"github.com/gin-gonic/gin"
)

type CommentHandler struct {
	svc *services.CommentService
}

func NewCommentHandler(svc *services.CommentService) *CommentHandler {
	return &CommentHandler{svc: svc}
}

// List handles GET /api/v1/tasks/:id/comments
func (h *CommentHandler) List(c *gin.Context) {
	taskID := c.Param("id")
	comments, err := h.svc.List(c.Request.Context(), taskID, currentOrgID(c))
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": comments})
}

// Add handles POST /api/v1/tasks/:id/comments
func (h *CommentHandler) Add(c *gin.Context) {
	var in services.AddCommentInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, apperr.Validation(err.Error()))
		return
	}
	taskID := c.Param("id")
	comment, err := h.svc.Add(c.Request.Context(), taskID, currentOrgID(c), currentUserID(c), currentRole(c), in)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, comment)
}
