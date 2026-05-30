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
	userRepo := repository.NewUserRepo(db)
	taskRepo := repository.NewTaskRepo(db)
	projRepo := repository.NewProjectRepo(db)

	// Services
	authSvc := services.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTRefreshSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)
	taskSvc := services.NewTaskService(taskRepo, redisCache)

	// Handlers
	authH := handlers.NewAuthHandler(authSvc)
	taskH := handlers.NewTaskHandler(taskSvc)
	userH := handlers.NewUserHandler(userRepo)
	projH := handlers.NewProjectHandler(projRepo)

	r := router.New(cfg.JWTSecret, authH, taskH, userH, projH)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("server shutdown: %v", err)
	}
	log.Println("server stopped")
}
