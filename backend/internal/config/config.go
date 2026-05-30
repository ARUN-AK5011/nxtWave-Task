package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port            string
	DatabaseURL     string
	RedisURL        string
	JWTSecret       string
	JWTRefreshSecret string
	AccessTokenTTL  int
	RefreshTokenTTL int
}

func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "8080"),
		DatabaseURL:      getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/tasktracker?sslmode=disable"),
		RedisURL:         getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:        getEnv("JWT_SECRET", "change-me-in-production"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", "change-refresh-me-in-production"),
		AccessTokenTTL:   getEnvInt("ACCESS_TOKEN_TTL_MINUTES", 15),
		RefreshTokenTTL:  getEnvInt("REFRESH_TOKEN_TTL_DAYS", 7),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
