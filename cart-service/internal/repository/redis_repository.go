package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/emart/cart-service/internal/config"
	"github.com/emart/cart-service/internal/model"
	"github.com/redis/go-redis/v9"
)

// ============================================================
// RedisRepository handles active cart storage
// Key pattern: cart:{userId}
// ============================================================

type RedisRepository interface {
	GetCart(ctx context.Context, userID string) (*model.Cart, error)
	SaveCart(ctx context.Context, cart *model.Cart) error
	DeleteCart(ctx context.Context, userID string) error
	GetAllActiveCartKeys(ctx context.Context) ([]string, error)
	IsHealthy(ctx context.Context) error
}

type redisRepository struct {
	client *redis.Client
	ttl    time.Duration
}
func NewRedisRepository(cfg *config.Config) (RedisRepository, error) {
    opt := &redis.Options{
        Addr:     cfg.Redis.Addr,
        Password: cfg.Redis.Password,
        DB:       cfg.Redis.DB,
    }

    client := redis.NewClient(opt)

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := client.Ping(ctx).Err(); err != nil {
        return nil, fmt.Errorf("Redis connection failed: %w", err)
    }

    return &redisRepository{
        client: client,
        ttl:    cfg.Redis.TTL,
    }, nil
}

// cartKey generates the Redis key for a user's cart
func cartKey(userID string) string {
	return fmt.Sprintf("cart:%s", userID)
}

// GetCart retrieves a cart from Redis by userID
func (r *redisRepository) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	key := cartKey(userID)

	data, err := r.client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Cart not found - not an error
		}
		return nil, fmt.Errorf("Redis GET failed for key %s: %w", key, err)
	}

	var cart model.Cart
	if err := json.Unmarshal(data, &cart); err != nil {
		return nil, fmt.Errorf("failed to deserialize cart: %w", err)
	}

	return &cart, nil
}

// SaveCart persists cart to Redis with configured TTL
func (r *redisRepository) SaveCart(ctx context.Context, cart *model.Cart) error {
	key := cartKey(cart.UserID)

	data, err := json.Marshal(cart)
	if err != nil {
		return fmt.Errorf("failed to serialize cart: %w", err)
	}

	if err := r.client.Set(ctx, key, data, r.ttl).Err(); err != nil {
		return fmt.Errorf("Redis SET failed for key %s: %w", key, err)
	}

	return nil
}

// DeleteCart removes a cart from Redis
func (r *redisRepository) DeleteCart(ctx context.Context, userID string) error {
	key := cartKey(userID)

	if err := r.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("Redis DEL failed for key %s: %w", key, err)
	}

	return nil
}

// GetAllActiveCartKeys returns all cart:* keys (used by sync service)
func (r *redisRepository) GetAllActiveCartKeys(ctx context.Context) ([]string, error) {
	pattern := "cart:*"
	var keys []string

	iter := r.client.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}

	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("Redis SCAN failed: %w", err)
	}

	return keys, nil
}

// IsHealthy pings Redis to check connection
func (r *redisRepository) IsHealthy(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}
