package handlers

import (
	"net/http"
	"task-tracker/internal/apperr"
	"task-tracker/internal/middleware"
	"task-tracker/internal/models"

	"github.com/gin-gonic/gin"
)

func respondErr(c *gin.Context, err error) {
	if e, ok := err.(*apperr.AppError); ok {
		c.JSON(e.Status, e)
		return
	}
	c.JSON(http.StatusInternalServerError, apperr.Internal())
}

func currentUserID(c *gin.Context) string {
	v, _ := c.Get(middleware.CtxUserID)
	s, _ := v.(string)
	return s
}

func currentOrgID(c *gin.Context) string {
	v, _ := c.Get(middleware.CtxOrgID)
	s, _ := v.(string)
	return s
}

func currentRole(c *gin.Context) models.Role {
	v, _ := c.Get(middleware.CtxUserRole)
	r, _ := v.(models.Role)
	return r
}
