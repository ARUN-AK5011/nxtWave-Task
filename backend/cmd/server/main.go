package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"task-tracker/internal/cache"
	"task-tracker/internal/config"
	"task-tracker/internal/database"
	"task-tracker/internal/handlers"
	"task-tracker/internal/repository"
	"task-tracker/internal/router"
	"task-tracker/internal/services"
	"task-tracker/internal/ws"
	"time"
)

func main() {
	cfg := config.Load()

	db, err := database.NewPool(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect to database: %v", err)
	}
	defer db.Close()
	log.Println("connected to PostgreSQL")

	redisCache, err := cache.New(cfg.RedisURL)
	if err != nil {
		log.Fatalf("connect to redis: %v", err)
	}
	log.Println("connected to Redis")

	// Repositories
	userRepo    := repository.NewUserRepo(db)
	taskRepo    := repository.NewTaskRepo(db)
	projRepo    := repository.NewProjectRepo(db)
	commentRepo := repository.NewCommentRepo(db)

	// Services
	authSvc    := services.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTRefreshSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)
	taskSvc    := services.NewTaskService(taskRepo, redisCache)
	commentSvc := services.NewCommentService(commentRepo, taskRepo)

	// WebSocket hub + overdue checker
	wsHub := ws.NewHub(db)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go wsHub.StartOverdueChecker(ctx)

	// Handlers
	authH    := handlers.NewAuthHandler(authSvc)
	taskH    := handlers.NewTaskHandler(taskSvc)
	userH    := handlers.NewUserHandler(userRepo)
	projH    := handlers.NewProjectHandler(projRepo)
	commentH := handlers.NewCommentHandler(commentSvc)
	wsH      := handlers.NewWSHandler(wsHub, cfg.JWTSecret)

	r := router.New(cfg.JWTSecret, authH, taskH, userH, projH, commentH, wsH)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // no timeout — WebSocket connections are long-lived
	}

	go func() {
		log.Printf("server listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	cancel() // stop overdue checker
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutCancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Fatalf("server shutdown: %v", err)
	}
	log.Println("server stopped")
}
