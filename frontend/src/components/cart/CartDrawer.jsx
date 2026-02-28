import React from 'react';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import './CartDrawer.css';

function CartDrawer() {
  const {
    cart, cartSummary, loading, cartOpen, closeCart,
    updateItem, removeItem, clearCart,
  } = useCart();

  const handleQuantityChange = async (itemId, newQty) => {
    if (newQty < 1) return;
    try {
      await updateItem(itemId, newQty);
    } catch {
      toast.error('Failed to update item quantity');
    }
  };

  const handleRemove = async (itemId, name) => {
    try {
      await removeItem(itemId);
      toast.success(`"${name}" removed from cart`);
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear your entire cart?')) return;
    try {
      await clearCart();
      toast.info('Cart cleared');
    } catch {
      toast.error('Failed to clear cart');
    }
  };

  // Go backend returns amounts as numbers (INR)
  const formatPrice = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(amount || 0);

  const categoryIcon  = (cat) => ({ books: '📚', courses: '🎓', software: '💻' }[cat] || '🛍');
  const categoryColor = (cat) => ({ books: '#10B981', courses: '#3B82F6', software: '#8B5CF6' }[cat] || '#6B7280');

  return (
    <>
      {cartOpen && (
        <div className="cart-overlay" onClick={closeCart} data-testid="cart-overlay" />
      )}

      <aside
        className={`cart-drawer ${cartOpen ? 'cart-drawer--open' : ''}`}
        data-testid="cart-drawer"
        aria-label="Shopping Cart"
      >
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-left">
            <h2>🛒 My Cart</h2>
            {cartSummary.total_items > 0 && (
              <span className="cart-count-pill">{cartSummary.total_items} items</span>
            )}
          </div>
          <button className="cart-close-btn" onClick={closeCart} data-testid="cart-close">✕</button>
        </div>

        {/* Body */}
        <div className="cart-body">
          {loading && (
            <div className="cart-loading">
              <div className="spinner-ring" />
              <p>Loading cart...</p>
            </div>
          )}

          {!loading && (!cart?.items || cart.items.length === 0) && (
            <div className="cart-empty" data-testid="cart-empty">
              <div className="empty-icon">🛒</div>
              <h3>Your cart is empty</h3>
              <p>Add items from Books, Courses, or Software to get started!</p>
            </div>
          )}

          {!loading && cart?.items?.length > 0 && (
            <div className="cart-items" data-testid="cart-items">
              {cart.items.map((item) => (
                <div className="cart-item" key={item.item_id} data-testid="cart-item">
                  <div
                    className="item-category-badge"
                    style={{ background: categoryColor(item.category) }}
                  >
                    {categoryIcon(item.category)}
                  </div>

                  <div className="item-details">
                    <p className="item-name" title={item.product_name}>{item.product_name}</p>
                    <p className="item-category">{item.category}</p>
                    <p className="item-unit-price">{formatPrice(item.price)} each</p>
                  </div>

                  <div className="item-controls">
                    <div className="quantity-control">
                      <button
                        className="qty-btn"
                        onClick={() => handleQuantityChange(item.item_id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >−</button>
                      <span className="qty-value" data-testid="item-qty">{item.quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => handleQuantityChange(item.item_id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >+</button>
                    </div>
                    <p className="item-subtotal">{formatPrice(item.price * item.quantity)}</p>
                    <button
                      className="item-remove-btn"
                      onClick={() => handleRemove(item.item_id, item.product_name)}
                      aria-label={`Remove ${item.product_name}`}
                      data-testid="remove-item"
                    >🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: totals use total_price (Go model field name) */}
        {cart?.items?.length > 0 && (
          <div className="cart-footer">
            <div className="cart-totals">
              <div className="total-row">
                <span>Subtotal ({cartSummary.total_items} items)</span>
                <span>{formatPrice(cartSummary.total_price)}</span>
              </div>
              <div className="total-row total-row--main">
                <span>Total</span>
                <span className="total-amount">{formatPrice(cartSummary.total_price)}</span>
              </div>
            </div>
            <button className="checkout-btn" data-testid="checkout-btn">
              Proceed to Checkout →
            </button>
            <button className="clear-cart-btn" onClick={handleClear} data-testid="clear-cart">
              Clear Cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default CartDrawer;
