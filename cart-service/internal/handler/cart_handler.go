package handler

import (
	"net/http"

	"github.com/emart/cart-service/internal/model"
	"github.com/emart/cart-service/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type CartHandler struct {
	cartService service.CartService
	logger      *zap.Logger
}

func NewCartHandler(cartService service.CartService, logger *zap.Logger) *CartHandler {
	return &CartHandler{cartService: cartService, logger: logger}
}

// RegisterRoutes sets up cart API routes
func (h *CartHandler) RegisterRoutes(router *gin.RouterGroup) {
	cart := router.Group("/cart")
	{
		cart.GET("",               h.GetCart)
		cart.GET("/summary",       h.GetCartSummary)
		cart.POST("/items",        h.AddItem)
		cart.PUT("/items/:itemId", h.UpdateItemQuantity)
		cart.DELETE("/items/:itemId", h.RemoveItem)
		cart.DELETE("",            h.ClearCart)
	}
}

// GetCart godoc
// @Summary Get full cart for authenticated user
// @Tags cart
// @Produce json
// @Security BearerAuth
// @Success 200 {object} model.ApiResponse
// @Router /api/v1/cart [get]
func (h *CartHandler) GetCart(c *gin.Context) {
	userID := c.GetString("user_id")
	cart, err := h.cartService.GetCart(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("GetCart failed", zap.String("userID", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, model.ErrorResponse("Failed to retrieve cart"))
		return
	}
	c.JSON(http.StatusOK, model.SuccessResponse(cart, "Cart retrieved successfully"))
}

// GetCartSummary returns lightweight cart info for header badge
func (h *CartHandler) GetCartSummary(c *gin.Context) {
	userID := c.GetString("user_id")
	summary, err := h.cartService.GetCartSummary(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse("Failed to retrieve cart summary"))
		return
	}
	c.JSON(http.StatusOK, model.SuccessResponse(summary, "Cart summary retrieved"))
}

// AddItem adds a product to the cart
func (h *CartHandler) AddItem(c *gin.Context) {
	userID := c.GetString("user_id")
	var req model.AddItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse("Invalid request: "+err.Error()))
		return
	}

	cart, err := h.cartService.AddItem(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("AddItem failed", zap.String("userID", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, model.ErrorResponse("Failed to add item to cart"))
		return
	}
	c.JSON(http.StatusOK, model.SuccessResponse(cart, "Item added to cart"))
}

// UpdateItemQuantity updates quantity of a cart item
func (h *CartHandler) UpdateItemQuantity(c *gin.Context) {
	userID := c.GetString("user_id")
	itemID := c.Param("itemId")

	var req model.UpdateQuantityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse("Invalid request"))
		return
	}

	cart, err := h.cartService.UpdateItemQuantity(c.Request.Context(), userID, itemID, req.Quantity)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.SuccessResponse(cart, "Cart updated"))
}

// RemoveItem removes a specific item from the cart
func (h *CartHandler) RemoveItem(c *gin.Context) {
	userID := c.GetString("user_id")
	itemID := c.Param("itemId")

	cart, err := h.cartService.RemoveItem(c.Request.Context(), userID, itemID)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.SuccessResponse(cart, "Item removed from cart"))
}

// ClearCart empties the entire cart
func (h *CartHandler) ClearCart(c *gin.Context) {
	userID := c.GetString("user_id")
	if err := h.cartService.ClearCart(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse("Failed to clear cart"))
		return
	}
	c.JSON(http.StatusOK, model.SuccessResponse(nil, "Cart cleared successfully"))
}
