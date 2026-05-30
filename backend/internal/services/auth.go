package services

import (
	"context"
	"net/http"
	"task-tracker/internal/apperr"
	"task-tracker/internal/middleware"
	"task-tracker/internal/models"
	"task-tracker/internal/repository"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo        *repository.UserRepo
	jwtSecret       string
	jwtRefreshSecret string
	accessTTL       time.Duration
	refreshTTL      time.Duration
}

func NewAuthService(userRepo *repository.UserRepo, jwtSecret, jwtRefreshSecret string, accessMinutes, refreshDays int) *AuthService {
	return &AuthService{
		userRepo:         userRepo,
		jwtSecret:        jwtSecret,
		jwtRefreshSecret: jwtRefreshSecret,
		accessTTL:        time.Duration(accessMinutes) * time.Minute,
		refreshTTL:       time.Duration(refreshDays) * 24 * time.Hour,
	}
}

type RegisterInput struct {
	Name     string `json:"name" binding:"required,min=2"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	OrgName  string `json:"org_name" binding:"required,min=2"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         *models.User `json:"user"`
}

func (s *AuthService) Register(ctx context.Context, in RegisterInput) (*AuthResponse, error) {
	existing, _ := s.userRepo.GetByEmail(ctx, in.Email)
	if existing != nil {
		return nil, apperr.Conflict("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperr.Internal()
	}

	org := &models.Organization{ID: uuid.NewString(), Name: in.OrgName}
	if err := s.userRepo.CreateOrg(ctx, org); err != nil {
		return nil, apperr.Internal()
	}

	user := &models.User{
		ID:             uuid.NewString(),
		OrganizationID: org.ID,
		Name:           in.Name,
		Email:          in.Email,
		PasswordHash:   string(hash),
		Role:           models.RoleAdmin,
	}
	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, apperr.Internal()
	}

	return s.buildTokenResponse(user)
}

func (s *AuthService) Login(ctx context.Context, in LoginInput) (*AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, in.Email)
	if err != nil {
		return nil, apperr.New(http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(in.Password)); err != nil {
		return nil, apperr.New(http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
	}
	return s.buildTokenResponse(user)
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*AuthResponse, error) {
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(refreshToken, claims, func(t *jwt.Token) (any, error) {
		return []byte(s.jwtRefreshSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, apperr.New(http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "invalid or expired refresh token")
	}
	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, apperr.New(http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "user not found")
	}
	return s.buildTokenResponse(user)
}

func (s *AuthService) buildTokenResponse(user *models.User) (*AuthResponse, error) {
	now := time.Now()
	accessClaims := &middleware.Claims{
		UserID: user.ID,
		OrgID:  user.OrganizationID,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, apperr.Internal()
	}

	refreshClaims := &middleware.Claims{
		UserID: user.ID,
		OrgID:  user.OrganizationID,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.refreshTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString([]byte(s.jwtRefreshSecret))
	if err != nil {
		return nil, apperr.Internal()
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}
