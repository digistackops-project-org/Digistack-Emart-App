package service

import (
	"context"
	"fmt"
	"time"

	"github.com/emart/cart-service/internal/model"
	mongorepo "github.com/emart/cart-service/internal/repository/mongo"
	redisrepo "github.com/emart/cart-service/internal/repository/redis"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// CartService interface
type CartService interface {
	GetCart(ctx context.Context, userID string) (*model.Cart, error)
	GetCartSummary(ctx context.Context, userID string) (*model.CartSummary, error)
	AddItem(ctx context.Context, userID string, req *model.AddItemRequest) (*model.Cart, error)
	UpdateItemQuantity(ctx context.Context, userID string, itemID string, quantity int) (*model.Cart, error)
	RemoveItem(ctx context.Context, userID string, itemID string) (*model.Cart, error)
	ClearCart(ctx context.Context, userID string) error
}

type cartService struct {
	redisRepo redisrepo.CartRedisRepository
	mongoRepo mongorepo.CartMongoRepository
	redisTTL  time.Duration
	logger    *zap.Logger
}

func NewCartService(
	redisRepo redisrepo.CartRedisRepository,
	mongoRepo mongorepo.CartMongoRepository,
	redisTTL time.Duration,
	logger *zap.Logger,
) CartService {
	return &cartService{
		redisRepo: redisRepo,
		mongoRepo: mongoRepo,
		redisTTL:  redisTTL,
		logger:    logger,
	}
}

// GetCart retrieves cart: Redis first, then MongoDB fallback
func (s *cartService) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	// Try Redis first (fast path)
	cart, err := s.redisRepo.GetCart(ctx, userID)
	if err != nil {
		s.logger.Warn("Redis get failed, falling back to MongoDB", zap.String("userID", userID), zap.Error(err))
	}
	if cart != nil {
		return cart, nil
	}

	// Fallback to MongoDB
	cart, err = s.mongoRepo.GetCart(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get cart from mongo: %w", err)
	}

	// Warm Redis cache from MongoDB
	if cart != nil {
		if saveErr := s.redisRepo.SaveCart(ctx, cart, s.redisTTL); saveErr != nil {
			s.logger.Warn("Failed to warm Redis cache", zap.Error(saveErr))
		}
	}

	// Return empty cart if none found
	if cart == nil {
		cart = s.newEmptyCart(userID)
	}

	return cart, nil
}

// GetCartSummary returns lightweight cart info for header display
func (s *cartService) GetCartSummary(ctx context.Context, userID string) (*model.CartSummary, error) {
	cart, err := s.GetCart(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &model.CartSummary{
		UserID:     userID,
		TotalItems: cart.TotalItems,
		TotalPrice: cart.TotalPrice,
	}, nil
}

// AddItem adds a product to the cart
func (s *cartService) AddItem(ctx context.Context, userID string, req *model.AddItemRequest) (*model.Cart, error) {
	cart, err := s.GetCart(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Check if product already in cart - increase quantity
	for i, item := range cart.Items {
		if item.ProductID == req.ProductID {
			cart.Items[i].Quantity += req.Quantity
			cart.Items[i].AddedAt = time.Now()
			return s.saveCart(ctx, cart)
		}
	}

	// Add new item
	newItem := model.CartItem{
		ItemID:      uuid.New().String(),
		ProductID:   req.ProductID,
		ProductName: req.ProductName,
		Category:    req.Category,
		Price:       req.Price,
		Quantity:    req.Quantity,
		ImageURL:    req.ImageURL,
		AddedAt:     time.Now(),
	}
	cart.Items = append(cart.Items, newItem)
	return s.saveCart(ctx, cart)
}

// UpdateItemQuantity changes quantity of a specific item (0 = remove)
func (s *cartService) UpdateItemQuantity(ctx context.Context, userID string, itemID string, quantity int) (*model.Cart, error) {
	cart, err := s.GetCart(ctx, userID)
	if err != nil {
		return nil, err
	}

	found := false
	newItems := make([]model.CartItem, 0)
	for _, item := range cart.Items {
		if item.ItemID == itemID {
			found = true
			if quantity > 0 {
				item.Quantity = quantity
				newItems = append(newItems, item)
			}
			// quantity == 0 means remove (don't append)
		} else {
			newItems = append(newItems, item)
		}
	}

	if !found {
		return nil, fmt.Errorf("item %s not found in cart", itemID)
	}

	cart.Items = newItems
	return s.saveCart(ctx, cart)
}

// RemoveItem removes a specific item from the cart
func (s *cartService) RemoveItem(ctx context.Context, userID string, itemID string) (*model.Cart, error) {
	return s.UpdateItemQuantity(ctx, userID, itemID, 0)
}

// ClearCart empties the entire cart
func (s *cartService) ClearCart(ctx context.Context, userID string) error {
	if err := s.redisRepo.DeleteCart(ctx, userID); err != nil {
		s.logger.Warn("Failed to delete cart from Redis", zap.Error(err))
	}
	if err := s.mongoRepo.DeleteCart(ctx, userID); err != nil {
		return fmt.Errorf("clear cart from mongo: %w", err)
	}
	return nil
}

// ============================================================
// Private helpers
// ============================================================

func (s *cartService) saveCart(ctx context.Context, cart *model.Cart) (*model.Cart, error) {
	cart.UpdatedAt = time.Now()
	cart.TotalItems, cart.TotalPrice = s.recalculate(cart.Items)

	// Always write to Redis (primary store)
	if err := s.redisRepo.SaveCart(ctx, cart, s.redisTTL); err != nil {
		s.logger.Error("Failed to save cart to Redis", zap.Error(err))
		// Don't fail - write to Mongo as safety net
	}

	// Write-through to MongoDB for durability on every mutation
	if err := s.mongoRepo.UpsertCart(ctx, cart); err != nil {
		s.logger.Error("Failed to upsert cart to MongoDB", zap.Error(err))
		return nil, err
	}

	return cart, nil
}

func (s *cartService) recalculate(items []model.CartItem) (totalItems int, totalPrice float64) {
	for _, item := range items {
		totalItems += item.Quantity
		totalPrice += item.Price * float64(item.Quantity)
	}
	return
}

func (s *cartService) newEmptyCart(userID string) *model.Cart {
	now := time.Now()
	return &model.Cart{
		UserID:        userID,
		Items:         []model.CartItem{},
		TotalItems:    0,
		TotalPrice:    0,
		CreatedAt:     now,
		UpdatedAt:     now,
		Source:        "new",
		SchemaVersion: 1,
	}
}
