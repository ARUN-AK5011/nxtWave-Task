package middleware

import (
	"net/http"
	"task-tracker/internal/apperr"
	"task-tracker/internal/models"

	"github.com/gin-gonic/gin"
)

// Require enforces that the authenticated user has one of the allowed roles.
func Require(roles ...models.Role) gin.HandlerFunc {
	allowed := make(map[models.Role]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *gin.Context) {
		role, _ := c.Get(CtxUserRole)
		userRole, ok := role.(models.Role)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, apperr.New(http.StatusForbidden, "FORBIDDEN", "access denied"))
			return
		}
		if _, permitted := allowed[userRole]; !permitted {
			c.AbortWithStatusJSON(http.StatusForbidden, apperr.New(http.StatusForbidden, "FORBIDDEN", "insufficient permissions for this action"))
			return
		}
		c.Next()
	}
}
