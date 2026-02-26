package service

import (
	"context"
	"strings"
	"time"

	"github.com/emart/cart-service/internal/config"
	"github.com/emart/cart-service/internal/repository"
	"go.uber.org/zap"
)

// ============================================================
// SyncService - Periodic Redis → MongoDB background sync
// Runs as goroutine every N minutes (configurable)
// This ensures cart data is durably persisted even if Redis restarts
// ============================================================

type SyncService struct {
	redisRepo repository.RedisRepository
	mongoRepo repository.MongoRepository
	interval  time.Duration
	logger    *zap.Logger
	stopCh    chan struct{}
}

func NewSyncService(
	cfg *config.Config,
	redisRepo repository.RedisRepository,
	mongoRepo repository.MongoRepository,
	logger *zap.Logger,
) *SyncService {
	return &SyncService{
		redisRepo: redisRepo,
		mongoRepo: mongoRepo,
		interval:  cfg.Sync.Interval,
		logger:    logger,
		stopCh:    make(chan struct{}),
	}
}

// Start begins the background sync loop in a goroutine
func (s *SyncService) Start() {
	s.logger.Info("Sync service started",
		zap.Duration("interval", s.interval))

	go func() {
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()

		// Run once immediately on startup
		s.syncAll()

		for {
			select {
			case <-ticker.C:
				s.syncAll()
			case <-s.stopCh:
				s.logger.Info("Sync service stopping - performing final sync")
				s.syncAll() // Final sync before shutdown
				return
			}
		}
	}()
}

// Stop gracefully shuts down the sync service
func (s *SyncService) Stop() {
	close(s.stopCh)
}

// syncAll syncs all carts from Redis → MongoDB
func (s *SyncService) syncAll() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	s.logger.Info("Starting Redis → MongoDB sync")
	startTime := time.Now()

	// Get all cart keys from Redis
	keys, err := s.redisRepo.GetAllActiveCartKeys(ctx)
	if err != nil {
		s.logger.Error("Failed to get cart keys from Redis", zap.Error(err))
		return
	}

	if len(keys) == 0 {
		s.logger.Debug("No active carts to sync")
		return
	}

	s.logger.Info("Syncing carts", zap.Int("count", len(keys)))

	synced := 0
	failed := 0

	for _, key := range keys {
		// Extract userID from "cart:{userId}"
		userID := strings.TrimPrefix(key, "cart:")
		if userID == "" {
			continue
		}

		if err := s.syncCart(ctx, userID); err != nil {
			s.logger.Error("Failed to sync cart",
				zap.String("userID", userID),
				zap.Error(err))
			failed++
		} else {
			synced++
		}
	}

	elapsed := time.Since(startTime)
	s.logger.Info("Sync completed",
		zap.Int("synced", synced),
		zap.Int("failed", failed),
		zap.Duration("elapsed", elapsed))
}

// syncCart syncs a single user's cart from Redis to MongoDB
func (s *SyncService) syncCart(ctx context.Context, userID string) error {
	cart, err := s.redisRepo.GetCart(ctx, userID)
	if err != nil {
		return err
	}
	if cart == nil {
		return nil // Cart expired from Redis, nothing to sync
	}

	return s.mongoRepo.UpsertCart(ctx, cart)
}
