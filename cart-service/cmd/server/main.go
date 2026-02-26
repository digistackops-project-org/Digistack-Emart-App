package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/emart/cart-service/internal/config"
	"github.com/emart/cart-service/internal/handler"
	"github.com/emart/cart-service/internal/middleware"
	"github.com/emart/cart-service/internal/migration"
	mongorepo "github.com/emart/cart-service/internal/repository/mongo"
	redisrepo "github.com/emart/cart-service/internal/repository/redis"
	"github.com/emart/cart-service/internal/service"
	"github.com/emart/cart-service/internal/sync"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	// ============================================================
	// Initialize Logger
	// ============================================================
	logger := buildLogger()
	defer logger.Sync()

	// ============================================================
	// Load Configuration
	// ============================================================
	cfg := config.Load()
	logger.Info("Starting Emart Cart Service",
		zap.String("version", cfg.App.Version),
		zap.String("env", cfg.App.Env),
		zap.String("port", cfg.Server.Port),
	)

	// ============================================================
	// Connect to Redis
	// ============================================================
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		logger.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	cancel()
	logger.Info("Redis connected", zap.String("addr", cfg.Redis.Addr))

	// ============================================================
	// Connect to MongoDB
	// ============================================================
	mongoCtx, mongoCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer mongoCancel()

	mongoClient, err := mongo.Connect(mongoCtx, options.Client().ApplyURI(cfg.MongoDB.URI))
	if err != nil {
		logger.Fatal("Failed to connect to MongoDB", zap.Error(err))
	}
	if err := mongoClient.Ping(mongoCtx, nil); err != nil {
		logger.Fatal("MongoDB ping failed", zap.Error(err))
	}
	db := mongoClient.Database(cfg.MongoDB.Database)
	logger.Info("MongoDB connected", zap.String("database", cfg.MongoDB.Database))

	// ============================================================
	// Run Mongock-style Migrations
	// ============================================================
	migrationRunner := migration.NewRunner(db, logger)
	migCtx, migCancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer migCancel()

	if err := migrationRunner.Run(migCtx); err != nil {
		logger.Fatal("Migration failed", zap.Error(err))
	}
	migrationRunner.PrintStatus(migCtx)

	// ============================================================
	// Initialize Repositories
	// ============================================================
	redisRepo := redisrepo.NewCartRedisRepository(redisClient)
	mongoRepo := mongorepo.NewCartMongoRepository(db)

	// ============================================================
	// Initialize Services
	// ============================================================
	cartSvc := service.NewCartService(redisRepo, mongoRepo, cfg.Redis.TTL, logger)

	// ============================================================
	// Start Background Sync (Redis -> MongoDB)
	// ============================================================
	syncer := sync.NewCartSyncer(redisRepo, mongoRepo, cfg, logger)
	syncCtx, syncCancel := context.WithCancel(context.Background())
	go syncer.Start(syncCtx)

	// ============================================================
	// Initialize HTTP Handlers
	// ============================================================
	gin.SetMode(cfg.Server.GinMode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORSMiddleware())

	// Health endpoints (no auth required)
	healthH := handler.NewHealthHandler(redisRepo, mongoRepo, cfg.App.Name, cfg.App.Version)
	healthH.RegisterRoutes(router)

	// API routes (JWT auth required)
	cartH := handler.NewCartHandler(cartSvc, logger)
	api := router.Group("/api/v1", middleware.JWTAuthMiddleware(cfg.JWT.Secret))
	cartH.RegisterRoutes(api)

	// ============================================================
	// Start HTTP Server
	// ============================================================
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	go func() {
		logger.Info("HTTP server starting", zap.String("port", cfg.Server.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("HTTP server error", zap.Error(err))
		}
	}()

	// ============================================================
	// Graceful Shutdown
	// ============================================================
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server gracefully...")
	syncCancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server shutdown error", zap.Error(err))
	}

	mongoClient.Disconnect(shutdownCtx)
	redisClient.Close()
	logger.Info("Cart service stopped")
}

func buildLogger() *zap.Logger {
	env := os.Getenv("APP_ENV")
	if env == "prod" {
		cfg := zap.NewProductionConfig()
		cfg.Level = zap.NewAtomicLevelAt(zapcore.WarnLevel)
		l, _ := cfg.Build()
		return l
	}
	cfg := zap.NewDevelopmentConfig()
	l, _ := cfg.Build()
	return l
}
