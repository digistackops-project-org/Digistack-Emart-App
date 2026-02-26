package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/emart/cart-service/internal/model"
	"github.com/emart/cart-service/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// ============================================================
// Mock Repositories
// ============================================================

type MockRedisRepo struct{ mock.Mock }

func (m *MockRedisRepo) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*model.Cart), args.Error(1)
}
func (m *MockRedisRepo) SaveCart(ctx context.Context, cart *model.Cart, ttl time.Duration) error {
	return m.Called(ctx, cart, ttl).Error(0)
}
func (m *MockRedisRepo) DeleteCart(ctx context.Context, userID string) error {
	return m.Called(ctx, userID).Error(0)
}
func (m *MockRedisRepo) GetAllCartKeys(ctx context.Context) ([]string, error) {
	args := m.Called(ctx)
	return args.Get(0).([]string), args.Error(1)
}
func (m *MockRedisRepo) Ping(ctx context.Context) error { return m.Called(ctx).Error(0) }

type MockMongoRepo struct{ mock.Mock }

func (m *MockMongoRepo) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*model.Cart), args.Error(1)
}
func (m *MockMongoRepo) UpsertCart(ctx context.Context, cart *model.Cart) error {
	return m.Called(ctx, cart).Error(0)
}
func (m *MockMongoRepo) DeleteCart(ctx context.Context, userID string) error {
	return m.Called(ctx, userID).Error(0)
}
func (m *MockMongoRepo) Ping(ctx context.Context) error { return m.Called(ctx).Error(0) }

// ============================================================
// Unit Tests
// ============================================================

func setupService(t *testing.T) (*service.CartService, *MockRedisRepo, *MockMongoRepo) {
	t.Helper()
	redisRepo := new(MockRedisRepo)
	mongoRepo := new(MockMongoRepo)
	logger, _ := zap.NewDevelopment()
	svc := service.NewCartService(redisRepo, mongoRepo, 7*24*time.Hour, logger)
	return &svc, redisRepo, mongoRepo
}

func TestGetCart_FromRedis(t *testing.T) {
	svc, redisRepo, _ := setupService(t)
	existingCart := &model.Cart{UserID: "user1", Items: []model.CartItem{}, Source: "redis"}

	redisRepo.On("GetCart", mock.Anything, "user1").Return(existingCart, nil)

	cart, err := (*svc).GetCart(context.Background(), "user1")
	assert.NoError(t, err)
	assert.Equal(t, "redis", cart.Source)
	redisRepo.AssertExpectations(t)
}

func TestGetCart_FallsBackToMongo_WhenRedisMisses(t *testing.T) {
	svc, redisRepo, mongoRepo := setupService(t)
	mongoCart := &model.Cart{UserID: "user2", Items: []model.CartItem{}, Source: "mongodb"}

	redisRepo.On("GetCart", mock.Anything, "user2").Return(nil, nil) // cache miss
	mongoRepo.On("GetCart", mock.Anything, "user2").Return(mongoCart, nil)
	redisRepo.On("SaveCart", mock.Anything, mock.Anything, mock.Anything).Return(nil) // warm cache

	cart, err := (*svc).GetCart(context.Background(), "user2")
	assert.NoError(t, err)
	assert.Equal(t, "mongodb", cart.Source)
}

func TestGetCart_ReturnsEmptyCart_WhenNowhere(t *testing.T) {
	svc, redisRepo, mongoRepo := setupService(t)

	redisRepo.On("GetCart", mock.Anything, "new-user").Return(nil, nil)
	mongoRepo.On("GetCart", mock.Anything, "new-user").Return(nil, nil)

	cart, err := (*svc).GetCart(context.Background(), "new-user")
	assert.NoError(t, err)
	assert.NotNil(t, cart)
	assert.Equal(t, "new-user", cart.UserID)
	assert.Empty(t, cart.Items)
	assert.Equal(t, 0, cart.TotalItems)
}

func TestAddItem_AddsNewProduct(t *testing.T) {
	svc, redisRepo, mongoRepo := setupService(t)

	emptyCart := &model.Cart{UserID: "user3", Items: []model.CartItem{}, TotalItems: 0}
	redisRepo.On("GetCart", mock.Anything, "user3").Return(emptyCart, nil)
	redisRepo.On("SaveCart", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	mongoRepo.On("UpsertCart", mock.Anything, mock.Anything).Return(nil)

	req := &model.AddItemRequest{
		ProductID: "book-001", ProductName: "Go Programming", Category: "books",
		Price: 29.99, Quantity: 1,
	}
	cart, err := (*svc).AddItem(context.Background(), "user3", req)

	assert.NoError(t, err)
	assert.Len(t, cart.Items, 1)
	assert.Equal(t, "book-001", cart.Items[0].ProductID)
	assert.Equal(t, 1, cart.TotalItems)
	assert.InDelta(t, 29.99, cart.TotalPrice, 0.001)
}

func TestAddItem_IncreasesQuantity_WhenProductExists(t *testing.T) {
	svc, redisRepo, mongoRepo := setupService(t)

	existingCart := &model.Cart{
		UserID: "user4",
		Items: []model.CartItem{
			{ItemID: "item-1", ProductID: "course-001", ProductName: "React Course",
			 Category: "courses", Price: 49.99, Quantity: 1},
		},
	}
	redisRepo.On("GetCart", mock.Anything, "user4").Return(existingCart, nil)
	redisRepo.On("SaveCart", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	mongoRepo.On("UpsertCart", mock.Anything, mock.Anything).Return(nil)

	req := &model.AddItemRequest{
		ProductID: "course-001", ProductName: "React Course",
		Category: "courses", Price: 49.99, Quantity: 2,
	}
	cart, err := (*svc).AddItem(context.Background(), "user4", req)

	assert.NoError(t, err)
	assert.Len(t, cart.Items, 1)         // still 1 unique item
	assert.Equal(t, 3, cart.Items[0].Quantity) // 1 + 2 = 3
}

func TestRemoveItem_RemovesCorrectItem(t *testing.T) {
	svc, redisRepo, mongoRepo := setupService(t)

	existingCart := &model.Cart{
		UserID: "user5",
		Items: []model.CartItem{
			{ItemID: "item-a", ProductID: "sw-001", Category: "software", Price: 99.99, Quantity: 1},
			{ItemID: "item-b", ProductID: "bk-002", Category: "books", Price: 19.99, Quantity: 2},
		},
	}
	redisRepo.On("GetCart", mock.Anything, "user5").Return(existingCart, nil)
	redisRepo.On("SaveCart", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	mongoRepo.On("UpsertCart", mock.Anything, mock.Anything).Return(nil)

	cart, err := (*svc).RemoveItem(context.Background(), "user5", "item-a")

	assert.NoError(t, err)
	assert.Len(t, cart.Items, 1)
	assert.Equal(t, "item-b", cart.Items[0].ItemID)
}

func TestRemoveItem_ErrorWhenItemNotFound(t *testing.T) {
	svc, redisRepo, _ := setupService(t)

	existingCart := &model.Cart{
		UserID: "user6",
		Items:  []model.CartItem{{ItemID: "item-x"}},
	}
	redisRepo.On("GetCart", mock.Anything, "user6").Return(existingCart, nil)

	_, err := (*svc).RemoveItem(context.Background(), "user6", "item-non-existent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestClearCart_DeletesFromBothStores(t *testing.T) {
	svc, redisRepo, mongoRepo := setupService(t)

	redisRepo.On("DeleteCart", mock.Anything, "user7").Return(nil)
	mongoRepo.On("DeleteCart", mock.Anything, "user7").Return(nil)

	err := (*svc).ClearCart(context.Background(), "user7")
	assert.NoError(t, err)
	redisRepo.AssertCalled(t, "DeleteCart", mock.Anything, "user7")
	mongoRepo.AssertCalled(t, "DeleteCart", mock.Anything, "user7")
}

func TestAddItem_ReturnsError_WhenMongoFails(t *testing.T) {
	svc, redisRepo, mongoRepo := setupService(t)

	redisRepo.On("GetCart", mock.Anything, "user8").Return(&model.Cart{UserID: "user8", Items: []model.CartItem{}}, nil)
	redisRepo.On("SaveCart", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	mongoRepo.On("UpsertCart", mock.Anything, mock.Anything).Return(errors.New("mongo connection refused"))

	req := &model.AddItemRequest{ProductID: "p1", ProductName: "Test", Category: "books", Price: 10.0, Quantity: 1}
	_, err := (*svc).AddItem(context.Background(), "user8", req)
	assert.Error(t, err)
}

func TestGetCartSummary_ReturnsTotals(t *testing.T) {
	svc, redisRepo, _ := setupService(t)

	cart := &model.Cart{
		UserID:     "user9",
		TotalItems: 5,
		TotalPrice: 149.95,
		Items:      []model.CartItem{},
	}
	redisRepo.On("GetCart", mock.Anything, "user9").Return(cart, nil)

	summary, err := (*svc).GetCartSummary(context.Background(), "user9")
	assert.NoError(t, err)
	assert.Equal(t, 5, summary.TotalItems)
	assert.InDelta(t, 149.95, summary.TotalPrice, 0.001)
}
