package sync

import (
	"context"
	"strings"
	"time"

	"github.com/emart/cart-service/internal/config"
	mongorepo "github.com/emart/cart-service/internal/repository/mongo"
	redisrepo "github.com/emart/cart-service/internal/repository/redis"
	"go.uber.org/zap"
)

// CartSyncer periodically syncs Redis cart data to MongoDB
type CartSyncer struct {
	redisRepo redisrepo.CartRedisRepository
	mongoRepo mongorepo.CartMongoRepository
	cfg       *config.Config
	logger    *zap.Logger
}

func NewCartSyncer(
	redisRepo redisrepo.CartRedisRepository,
	mongoRepo mongorepo.CartMongoRepository,
	cfg *config.Config,
	logger *zap.Logger,
) *CartSyncer {
	return &CartSyncer{
		redisRepo: redisRepo,
		mongoRepo: mongoRepo,
		cfg:       cfg,
		logger:    logger,
	}
}

// Start launches the background sync goroutine
func (s *CartSyncer) Start(ctx context.Context) {
	s.logger.Info("Cart syncer started",
		zap.Duration("interval", s.cfg.Sync.Interval),
		zap.Int("batchSize", s.cfg.Sync.BatchSize),
	)

	ticker := time.NewTicker(s.cfg.Sync.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("Cart syncer stopped")
			return
		case <-ticker.C:
			s.syncAll(ctx)
		}
	}
}

// syncAll iterates all Redis cart keys and syncs to MongoDB
func (s *CartSyncer) syncAll(ctx context.Context) {
	keys, err := s.redisRepo.GetAllCartKeys(ctx)
	if err != nil {
		s.logger.Error("Failed to get cart keys from Redis", zap.Error(err))
		return
	}

	synced := 0
	failed := 0

	for _, key := range keys {
		// Extract userID from key (format: cart:<userID>)
		userID := strings.TrimPrefix(key, "cart:")
		if userID == "" {
			continue
		}

		cart, err := s.redisRepo.GetCart(ctx, userID)
		if err != nil {
			s.logger.Warn("Failed to get cart from Redis for sync",
				zap.String("userID", userID), zap.Error(err))
			failed++
			continue
		}
		if cart == nil {
			continue
		}

		if err := s.mongoRepo.UpsertCart(ctx, cart); err != nil {
			s.logger.Error("Failed to sync cart to MongoDB",
				zap.String("userID", userID), zap.Error(err))
			failed++
			continue
		}
		synced++
	}

	if synced > 0 || failed > 0 {
		s.logger.Info("Cart sync complete",
			zap.Int("synced", synced),
			zap.Int("failed", failed),
			zap.Int("total", len(keys)),
		)
	}
}
