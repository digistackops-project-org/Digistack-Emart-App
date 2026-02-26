package redisrepo

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/emart/cart-service/internal/model"
	"github.com/redis/go-redis/v9"
)

const cartKeyPrefix = "cart:"

// CartRedisRepository interface
type CartRedisRepository interface {
	GetCart(ctx context.Context, userID string) (*model.Cart, error)
	SaveCart(ctx context.Context, cart *model.Cart, ttl time.Duration) error
	DeleteCart(ctx context.Context, userID string) error
	GetAllCartKeys(ctx context.Context) ([]string, error)
	Ping(ctx context.Context) error
}

type cartRedisRepo struct {
	client *redis.Client
}

func NewCartRedisRepository(client *redis.Client) CartRedisRepository {
	return &cartRedisRepo{client: client}
}

func cartKey(userID string) string {
	return fmt.Sprintf("%s%s", cartKeyPrefix, userID)
}

func (r *cartRedisRepo) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	data, err := r.client.Get(ctx, cartKey(userID)).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("redis get cart: %w", err)
	}
	var cart model.Cart
	if err := json.Unmarshal(data, &cart); err != nil {
		return nil, fmt.Errorf("unmarshal cart: %w", err)
	}
	cart.Source = "redis"
	return &cart, nil
}

func (r *cartRedisRepo) SaveCart(ctx context.Context, cart *model.Cart, ttl time.Duration) error {
	data, err := json.Marshal(cart)
	if err != nil {
		return fmt.Errorf("marshal cart: %w", err)
	}
	return r.client.Set(ctx, cartKey(cart.UserID), data, ttl).Err()
}

func (r *cartRedisRepo) DeleteCart(ctx context.Context, userID string) error {
	return r.client.Del(ctx, cartKey(userID)).Err()
}

func (r *cartRedisRepo) GetAllCartKeys(ctx context.Context) ([]string, error) {
	return r.client.Keys(ctx, cartKeyPrefix+"*").Result()
}

func (r *cartRedisRepo) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}
