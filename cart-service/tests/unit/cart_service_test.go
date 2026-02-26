package unit

import (
	"context"
	"testing"
	"time"

	"github.com/emart/cart-service/internal/model"
	"github.com/emart/cart-service/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// ============================================================
// Mock Redis Repository
// ============================================================
type MockRedisRepository struct {
	mock.Mock
}

func (m *MockRedisRepository) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Cart), args.Error(1)
}

func (m *MockRedisRepository) SaveCart(ctx context.Context, cart *model.Cart) error {
	args := m.Called(ctx, cart)
	return args.Error(0)
}

func (m *MockRedisRepository) DeleteCart(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockRedisRepository) GetAllActiveCartKeys(ctx context.Context) ([]string, error) {
	args := m.Called(ctx)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockRedisRepository) IsHealthy(ctx context.Context) error {
	return m.Called(ctx).Error(0)
}

// ============================================================
// Mock MongoDB Repository
// ============================================================
type MockMongoRepository struct {
	mock.Mock
}

func (m *MockMongoRepository) UpsertCart(ctx context.Context, cart *model.Cart) error {
	return m.Called(ctx, cart).Error(0)
}

func (m *MockMongoRepository) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Cart), args.Error(1)
}

func (m *MockMongoRepository) GetCartsByStatus(ctx context.Context, status string) ([]model.Cart, error) {
	args := m.Called(ctx, status)
	return args.Get(0).([]model.Cart), args.Error(1)
}

func (m *MockMongoRepository) UpdateCartStatus(ctx context.Context, userID, status string) error {
	return m.Called(ctx, userID, status).Error(0)
}

func (m *MockMongoRepository) IsHealthy(ctx context.Context) error {
	return m.Called(ctx).Error(0)
}

// ============================================================
// Test Setup Helper
// ============================================================
func newTestService(redisRepo *MockRedisRepository, mongoRepo *MockMongoRepository) service.CartService {
	logger, _ := zap.NewDevelopment()
	return service.NewCartService(redisRepo, mongoRepo, logger)
}

func buildCart(userID string, items ...model.CartItem) *model.Cart {
	c := &model.Cart{
		UserID:    userID,
		UserEmail: userID + "@test.com",
		Items:     items,
		Currency:  model.CurrencyINR,
		Status:    model.CartStatusActive,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	c.ComputeTotals()
	return c
}

// ============================================================
// Unit Tests: GetCart
// ============================================================

func TestGetCart_FoundInRedis(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	expectedCart := buildCart("user-001", model.CartItem{
		ItemID: "item-1", ProductID: "prod-1", ProductName: "Clean Code",
		Category: "books", Price: 499, Quantity: 2,
	})

	redis.On("GetCart", mock.Anything, "user-001").Return(expectedCart, nil)

	cart, err := svc.GetCart(context.Background(), "user-001")

	assert.NoError(t, err)
	assert.NotNil(t, cart)
	assert.Equal(t, "user-001", cart.UserID)
	assert.Len(t, cart.Items, 1)
	redis.AssertExpectations(t)
	// MongoDB should NOT be called
	mongo.AssertNotCalled(t, "GetCart")
}

func TestGetCart_RedisEmpty_FallbackToMongo(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	mongoCart := buildCart("user-002", model.CartItem{
		ItemID: "item-2", ProductID: "prod-2", ProductName: "Go Programming",
		Category: "books", Price: 699, Quantity: 1,
	})

	redis.On("GetCart", mock.Anything, "user-002").Return(nil, nil)
	mongo.On("GetCart", mock.Anything, "user-002").Return(mongoCart, nil)
	redis.On("SaveCart", mock.Anything, mock.AnythingOfType("*model.Cart")).Return(nil)

	cart, err := svc.GetCart(context.Background(), "user-002")

	assert.NoError(t, err)
	assert.NotNil(t, cart)
	assert.Equal(t, "user-002", cart.UserID)
	// Redis should have been warmed up
	redis.AssertCalled(t, "SaveCart", mock.Anything, mock.Anything)
	redis.AssertExpectations(t)
	mongo.AssertExpectations(t)
}

func TestGetCart_NotFoundAnywhere_ReturnsNil(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	redis.On("GetCart", mock.Anything, "user-new").Return(nil, nil)
	mongo.On("GetCart", mock.Anything, "user-new").Return(nil, nil)

	cart, err := svc.GetCart(context.Background(), "user-new")

	assert.NoError(t, err)
	assert.Nil(t, cart)
}

// ============================================================
// Unit Tests: AddItem
// ============================================================

func TestAddItem_NewCart_CreatesAndAddsItem(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	redis.On("GetCart", mock.Anything, "user-003").Return(nil, nil)
	mongo.On("GetCart", mock.Anything, "user-003").Return(nil, nil)
	redis.On("SaveCart", mock.Anything, mock.AnythingOfType("*model.Cart")).Return(nil)

	req := &model.AddItemRequest{
		ProductID:   "prod-101",
		ProductName: "The Pragmatic Programmer",
		Category:    "books",
		Price:       799.0,
		Quantity:    1,
	}

	cart, err := svc.AddItem(context.Background(), "user-003", "user-003@test.com", req)

	assert.NoError(t, err)
	assert.NotNil(t, cart)
	assert.Len(t, cart.Items, 1)
	assert.Equal(t, "prod-101", cart.Items[0].ProductID)
	assert.Equal(t, 1, cart.TotalItems)
	assert.Equal(t, 799.0, cart.TotalAmount)
}

func TestAddItem_ExistingProduct_IncrementsQuantity(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	existingCart := buildCart("user-004", model.CartItem{
		ItemID: "item-x", ProductID: "prod-200", ProductName: "Go in Action",
		Category: "books", Price: 599, Quantity: 1,
	})

	redis.On("GetCart", mock.Anything, "user-004").Return(existingCart, nil)
	redis.On("SaveCart", mock.Anything, mock.AnythingOfType("*model.Cart")).Return(nil)

	req := &model.AddItemRequest{
		ProductID:   "prod-200", // Same product
		ProductName: "Go in Action",
		Category:    "books",
		Price:       599.0,
		Quantity:    2,
	}

	cart, err := svc.AddItem(context.Background(), "user-004", "user-004@test.com", req)

	assert.NoError(t, err)
	assert.Len(t, cart.Items, 1) // Still 1 item
	assert.Equal(t, 3, cart.Items[0].Quantity) // 1 + 2 = 3
	assert.Equal(t, 3, cart.TotalItems)
	assert.InDelta(t, 1797.0, cart.TotalAmount, 0.01)
}

func TestAddItem_DifferentProducts_AppendsBothItems(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	existingCart := buildCart("user-005", model.CartItem{
		ItemID: "item-a", ProductID: "prod-A", ProductName: "Course Python",
		Category: "courses", Price: 999, Quantity: 1,
	})

	redis.On("GetCart", mock.Anything, "user-005").Return(existingCart, nil)
	redis.On("SaveCart", mock.Anything, mock.AnythingOfType("*model.Cart")).Return(nil)

	req := &model.AddItemRequest{
		ProductID:   "prod-B",
		ProductName: "VSCode Pro",
		Category:    "software",
		Price:       1999.0,
		Quantity:    1,
	}

	cart, err := svc.AddItem(context.Background(), "user-005", "user-005@test.com", req)

	assert.NoError(t, err)
	assert.Len(t, cart.Items, 2) // Now 2 items
	assert.Equal(t, 2, cart.TotalItems)
	assert.InDelta(t, 2998.0, cart.TotalAmount, 0.01)
}

// ============================================================
// Unit Tests: RemoveItem
// ============================================================

func TestRemoveItem_ValidItemID_RemovesItem(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	existingCart := buildCart("user-006",
		model.CartItem{ItemID: "item-keep", ProductID: "p1", ProductName: "A", Category: "books", Price: 100, Quantity: 1},
		model.CartItem{ItemID: "item-remove", ProductID: "p2", ProductName: "B", Category: "books", Price: 200, Quantity: 1},
	)

	redis.On("GetCart", mock.Anything, "user-006").Return(existingCart, nil)
	redis.On("SaveCart", mock.Anything, mock.AnythingOfType("*model.Cart")).Return(nil)

	cart, err := svc.RemoveItem(context.Background(), "user-006", "item-remove")

	assert.NoError(t, err)
	assert.Len(t, cart.Items, 1)
	assert.Equal(t, "item-keep", cart.Items[0].ItemID)
	assert.Equal(t, 1, cart.TotalItems)
	assert.InDelta(t, 100.0, cart.TotalAmount, 0.01)
}

func TestRemoveItem_InvalidItemID_ReturnsError(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	existingCart := buildCart("user-007",
		model.CartItem{ItemID: "item-real", ProductID: "p1", ProductName: "A", Category: "books", Price: 100, Quantity: 1},
	)

	redis.On("GetCart", mock.Anything, "user-007").Return(existingCart, nil)

	_, err := svc.RemoveItem(context.Background(), "user-007", "item-nonexistent")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

// ============================================================
// Unit Tests: UpdateItem
// ============================================================

func TestUpdateItem_ValidItem_UpdatesQuantity(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	existingCart := buildCart("user-008",
		model.CartItem{ItemID: "item-q", ProductID: "p1", ProductName: "Book", Category: "books", Price: 300, Quantity: 1},
	)

	redis.On("GetCart", mock.Anything, "user-008").Return(existingCart, nil)
	redis.On("SaveCart", mock.Anything, mock.AnythingOfType("*model.Cart")).Return(nil)

	cart, err := svc.UpdateItem(context.Background(), "user-008", "item-q",
		&model.UpdateItemRequest{Quantity: 5})

	assert.NoError(t, err)
	assert.Equal(t, 5, cart.Items[0].Quantity)
	assert.InDelta(t, 1500.0, cart.TotalAmount, 0.01)
}

// ============================================================
// Unit Tests: ComputeTotals
// ============================================================

func TestComputeTotals_MultipleItems_CorrectSum(t *testing.T) {
	cart := &model.Cart{
		Items: []model.CartItem{
			{Price: 100, Quantity: 2},
			{Price: 250, Quantity: 3},
			{Price: 50, Quantity: 1},
		},
	}
	cart.ComputeTotals()

	assert.Equal(t, 6, cart.TotalItems)        // 2+3+1
	assert.InDelta(t, 1000.0, cart.TotalAmount, 0.01) // 200+750+50
}

func TestComputeTotals_EmptyCart_ZeroTotals(t *testing.T) {
	cart := &model.Cart{Items: []model.CartItem{}}
	cart.ComputeTotals()
	assert.Equal(t, 0, cart.TotalItems)
	assert.Equal(t, 0.0, cart.TotalAmount)
}

// ============================================================
// Unit Tests: GetCartSummary
// ============================================================

func TestGetCartSummary_ActiveCart_ReturnsSummary(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	cart := buildCart("user-009",
		model.CartItem{ItemID: "i1", ProductID: "p1", ProductName: "A", Category: "books", Price: 999, Quantity: 2},
	)

	redis.On("GetCart", mock.Anything, "user-009").Return(cart, nil)

	summary, err := svc.GetCartSummary(context.Background(), "user-009")

	assert.NoError(t, err)
	assert.Equal(t, 2, summary.TotalItems)
	assert.InDelta(t, 1998.0, summary.TotalAmount, 0.01)
}

func TestGetCartSummary_NoCart_ReturnsEmptySummary(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	redis.On("GetCart", mock.Anything, "user-010").Return(nil, nil)
	mongo.On("GetCart", mock.Anything, "user-010").Return(nil, nil)

	summary, err := svc.GetCartSummary(context.Background(), "user-010")

	assert.NoError(t, err)
	assert.Equal(t, 0, summary.TotalItems)
	assert.Equal(t, 0.0, summary.TotalAmount)
}

// ============================================================
// Unit Tests: ClearCart
// ============================================================

func TestClearCart_RemovesFromRedisAndUpdatesMongoStatus(t *testing.T) {
	redis := &MockRedisRepository{}
	mongo := &MockMongoRepository{}
	svc := newTestService(redis, mongo)

	redis.On("DeleteCart", mock.Anything, "user-011").Return(nil)
	mongo.On("UpdateCartStatus", mock.Anything, "user-011", model.CartStatusAbandoned).Return(nil)

	err := svc.ClearCart(context.Background(), "user-011")

	assert.NoError(t, err)
	redis.AssertCalled(t, "DeleteCart", mock.Anything, "user-011")
	mongo.AssertCalled(t, "UpdateCartStatus", mock.Anything, "user-011", model.CartStatusAbandoned)
}
