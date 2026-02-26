package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/emart/cart-service/internal/handler"
	"github.com/emart/cart-service/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// ============================================================
// Mock CartService
// ============================================================
type MockCartService struct{ mock.Mock }

func (m *MockCartService) GetCart(ctx context.Context, userID string) (*model.Cart, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*model.Cart), args.Error(1)
}
func (m *MockCartService) GetCartSummary(ctx context.Context, userID string) (*model.CartSummary, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*model.CartSummary), args.Error(1)
}
func (m *MockCartService) AddItem(ctx context.Context, userID string, req *model.AddItemRequest) (*model.Cart, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*model.Cart), args.Error(1)
}
func (m *MockCartService) UpdateItemQuantity(ctx context.Context, userID, itemID string, qty int) (*model.Cart, error) {
	args := m.Called(ctx, userID, itemID, qty)
	return args.Get(0).(*model.Cart), args.Error(1)
}
func (m *MockCartService) RemoveItem(ctx context.Context, userID, itemID string) (*model.Cart, error) {
	args := m.Called(ctx, userID, itemID)
	return args.Get(0).(*model.Cart), args.Error(1)
}
func (m *MockCartService) ClearCart(ctx context.Context, userID string) error {
	return m.Called(ctx, userID).Error(0)
}

func setupRouter(svc *MockCartService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// Inject user_id as if JWT middleware ran
	r.Use(func(c *gin.Context) { c.Set("user_id", "test-user-123"); c.Next() })
	logger, _ := zap.NewDevelopment()
	h := handler.NewCartHandler(svc, logger)
	api := r.Group("/api/v1")
	h.RegisterRoutes(api)
	return r
}

func TestGetCartHandler_Returns200(t *testing.T) {
	svc := new(MockCartService)
	cart := &model.Cart{UserID: "test-user-123", Items: []model.CartItem{}, TotalItems: 0}
	svc.On("GetCart", mock.Anything, "test-user-123").Return(cart, nil)

	r := setupRouter(svc)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/cart", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.True(t, resp["success"].(bool))
}

func TestAddItemHandler_Returns200_WithValidRequest(t *testing.T) {
	svc := new(MockCartService)
	cart := &model.Cart{UserID: "test-user-123", TotalItems: 1, TotalPrice: 29.99}
	svc.On("AddItem", mock.Anything, "test-user-123", mock.Anything).Return(cart, nil)

	body, _ := json.Marshal(map[string]interface{}{
		"product_id": "book-001", "product_name": "Go Book",
		"category": "books", "price": 29.99, "quantity": 1,
	})

	r := setupRouter(svc)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/cart/items", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.True(t, resp["success"].(bool))
}

func TestAddItemHandler_Returns400_InvalidCategory(t *testing.T) {
	svc := new(MockCartService)
	body, _ := json.Marshal(map[string]interface{}{
		"product_id": "p1", "product_name": "Test",
		"category": "INVALID_CATEGORY", "price": 10.0, "quantity": 1,
	})

	r := setupRouter(svc)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/cart/items", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAddItemHandler_Returns400_NegativePrice(t *testing.T) {
	svc := new(MockCartService)
	body, _ := json.Marshal(map[string]interface{}{
		"product_id": "p1", "product_name": "Test",
		"category": "books", "price": -5.0, "quantity": 1,
	})

	r := setupRouter(svc)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/cart/items", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRemoveItemHandler_Returns200(t *testing.T) {
	svc := new(MockCartService)
	cart := &model.Cart{UserID: "test-user-123", Items: []model.CartItem{}}
	svc.On("RemoveItem", mock.Anything, "test-user-123", "item-abc").Return(cart, nil)

	r := setupRouter(svc)
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/cart/items/item-abc", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestClearCartHandler_Returns200(t *testing.T) {
	svc := new(MockCartService)
	svc.On("ClearCart", mock.Anything, "test-user-123").Return(nil)

	r := setupRouter(svc)
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/cart", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}
