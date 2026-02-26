package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration
type Config struct {
	Server   ServerConfig
	Redis    RedisConfig
	MongoDB  MongoDBConfig
	JWT      JWTConfig
	Sync     SyncConfig
	App      AppConfig
}

type ServerConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	GinMode      string
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
	TTL      time.Duration // Cart TTL in Redis (default 7 days)
}

type MongoDBConfig struct {
	URI      string
	Database string
	Timeout  time.Duration
}

type JWTConfig struct {
	Secret string
}

type SyncConfig struct {
	Interval      time.Duration // How often to sync Redis -> MongoDB
	BatchSize     int           // How many carts to sync at once
}

type AppConfig struct {
	Name    string
	Version string
	Env     string
}

// Load reads configuration from environment variables
func Load() *Config {
	return &Config{
		App: AppConfig{
			Name:    getEnv("APP_NAME", "emart-cart-service"),
			Version: getEnv("APP_VERSION", "1.0.0"),
			Env:     getEnv("APP_ENV", "dev"),
		},
		Server: ServerConfig{
			Port:         getEnv("SERVER_PORT", "8081"),
			ReadTimeout:  getDurationEnv("SERVER_READ_TIMEOUT", 15*time.Second),
			WriteTimeout: getDurationEnv("SERVER_WRITE_TIMEOUT", 15*time.Second),
			GinMode:      getEnv("GIN_MODE", "debug"),
		},
		Redis: RedisConfig{
			Addr:     getEnv("REDIS_ADDR", "localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getIntEnv("REDIS_DB", 0),
			TTL:      getDurationEnv("REDIS_CART_TTL", 7*24*time.Hour),
		},
		MongoDB: MongoDBConfig{
			URI:      getEnv("MONGO_URI", "mongodb://localhost:27017"),
			Database: getEnv("MONGO_DATABASE", "cart"),
			Timeout:  getDurationEnv("MONGO_TIMEOUT", 10*time.Second),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", ""),
		},
		Sync: SyncConfig{
			Interval:  getDurationEnv("SYNC_INTERVAL", 30*time.Second),
			BatchSize: getIntEnv("SYNC_BATCH_SIZE", 100),
		},
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getIntEnv(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if n, err := strconv.Atoi(val); err == nil {
			return n
		}
	}
	return fallback
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return fallback
}
