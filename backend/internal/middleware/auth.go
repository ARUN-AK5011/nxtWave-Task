package middleware

import (
	"net/http"
	"strings"
	"task-tracker/internal/apperr"
	"task-tracker/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	CtxUserID   = "user_id"
	CtxUserRole = "user_role"
	CtxOrgID    = "org_id"
)

type Claims struct {
	UserID string      `json:"user_id"`
	OrgID  string      `json:"org_id"`
	Role   models.Role `json:"role"`
	jwt.RegisteredClaims
}

func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, apperr.New(http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid authorization header"))
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, apperr.New(http.StatusUnauthorized, "UNAUTHORIZED", "invalid or expired token"))
			return
		}
		if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, apperr.New(http.StatusUnauthorized, "TOKEN_EXPIRED", "access token expired"))
			return
		}
		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxUserRole, claims.Role)
		c.Set(CtxOrgID, claims.OrgID)
		c.Next()
	}
}
