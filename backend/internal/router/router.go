package router

import (
	"task-tracker/internal/handlers"
	"task-tracker/internal/middleware"
	"task-tracker/internal/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func New(
	jwtSecret string,
	authH    *handlers.AuthHandler,
	taskH    *handlers.TaskHandler,
	userH    *handlers.UserHandler,
	projH    *handlers.ProjectHandler,
	commentH *handlers.CommentHandler,
	wsH      *handlers.WSHandler,
) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	// WebSocket — auth handled inside handler via ?token= query param.
	r.GET("/api/v1/ws", wsH.ServeWS)

	auth := r.Group("/api/v1/auth")
	{
		auth.POST("/register", authH.Register)
		auth.POST("/login", authH.Login)
		auth.POST("/refresh", authH.Refresh)
	}

	api := r.Group("/api/v1")
	api.Use(middleware.Auth(jwtSecret))
	{
		api.GET("/me", userH.Me)

		// All authenticated users can fetch org members (for assignee picker).
		api.GET("/members", userH.OrgMembers)

		users := api.Group("/users")
		users.Use(middleware.Require(models.RoleAdmin))
		{
			users.GET("", userH.ListMembers)
			users.PATCH("/:id/role", userH.UpdateRole)
		}

		projects := api.Group("/projects")
		{
			projects.GET("", projH.List)
			projects.POST("", middleware.Require(models.RoleAdmin, models.RoleManager), projH.Create)
			projects.DELETE("/:id", middleware.Require(models.RoleAdmin), projH.Delete)
		}

		tasks := api.Group("/tasks")
		{
			tasks.GET("", taskH.List)
			tasks.POST("", middleware.Require(models.RoleAdmin, models.RoleManager), taskH.Create)
			tasks.GET("/:id", taskH.GetByID)
			tasks.PUT("/:id", middleware.Require(models.RoleAdmin, models.RoleManager), taskH.Update)
			tasks.PATCH("/:id/status", taskH.UpdateStatus)
			tasks.DELETE("/:id", middleware.Require(models.RoleAdmin), taskH.Delete)

			// Comments — all authenticated users; service enforces assignee/manager/admin for POST.
			tasks.GET("/:id/comments", commentH.List)
			tasks.POST("/:id/comments", commentH.Add)
		}
	}

	return r
}
