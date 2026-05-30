package handlers

import (
	"net/http"
	"task-tracker/internal/apperr"
	"task-tracker/internal/services"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc *services.AuthService
}

func NewAuthHandler(svc *services.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var in services.RegisterInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, apperr.Validation(err.Error()))
		return
	}
	resp, err := h.svc.Register(c.Request.Context(), in)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var in services.LoginInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, apperr.Validation(err.Error()))
		return
	}
	resp, err := h.svc.Login(c.Request.Context(), in)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, apperr.Validation(err.Error()))
		return
	}
	resp, err := h.svc.RefreshToken(c.Request.Context(), body.RefreshToken)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}
