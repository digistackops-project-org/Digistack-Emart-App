import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { cartService } from '../../services/cartApi';
import './CartSidebar.css';

function CartSidebar({ isOpen, onClose, onCartUpdate }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchCart();
  }, [isOpen]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await cartService.getCart();
      setCart(res.data.data);
    } catch (err) {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty === 0) { handleRemove(itemId); return; }
    try {
      const res = await cartService.updateQuantity(itemId, newQty);
      setCart(res.data.data);
      onCartUpdate();
    } catch { toast.error('Failed to update quantity'); }
  };

  const handleRemove = async (itemId) => {
    try {
      const res = await cartService.removeItem(itemId);
      setCart(res.data.data);
      onCartUpdate();
      toast.success('Item removed from cart');
    } catch { toast.error('Failed to remove item'); }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear entire cart?')) return;
    try {
      await cartService.clearCart();
      setCart(prev => ({ ...prev, items: [], total_items: 0, total_price: 0 }));
      onCartUpdate();
      toast.success('Cart cleared');
    } catch { toast.error('Failed to clear cart'); }
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'books':    return '📚';
      case 'courses':  return '🎓';
      case 'software': return '💻';
      default:         return '🛍️';
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="cart-overlay"
          onClick={onClose}
          data-testid="cart-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`cart-sidebar ${isOpen ? 'open' : ''}`}
        data-testid="cart-sidebar"
      >
        {/* Header */}
        <div className="cart-header">
          <h2>🛒 My Cart
            {cart?.total_items > 0 && (
              <span className="cart-count-badge">{cart.total_items}</span>
            )}
          </h2>
          <button className="close-btn" onClick={onClose} data-testid="cart-close-btn">✕</button>
        </div>

        {/* Content */}
        <div className="cart-body">
          {loading ? (
            <div className="cart-loading" data-testid="cart-loading">Loading cart...</div>
          ) : !cart || cart.items?.length === 0 ? (
            <div className="cart-empty" data-testid="cart-empty">
              <span className="empty-icon">🛒</span>
              <p>Your cart is empty</p>
              <p className="empty-sub">Browse Books, Courses or Software to add items</p>
            </div>
          ) : (
            <ul className="cart-items" data-testid="cart-items">
              {cart.items.map(item => (
                <li key={item.item_id} className="cart-item" data-testid={`cart-item-${item.item_id}`}>
                  <div className="item-emoji">{getCategoryEmoji(item.category)}</div>
                  <div className="item-details">
                    <p className="item-name">{item.product_name}</p>
                    <span className={`item-category ${item.category}`}>{item.category}</span>
                    <p className="item-price">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="item-controls">
                    <button
                      className="qty-btn"
                      onClick={() => handleUpdateQty(item.item_id, item.quantity - 1)}
                      data-testid={`decrease-qty-${item.item_id}`}
                    >−</button>
                    <span className="qty-display" data-testid={`qty-${item.item_id}`}>
                      {item.quantity}
                    </span>
                    <button
                      className="qty-btn"
                      onClick={() => handleUpdateQty(item.item_id, item.quantity + 1)}
                      data-testid={`increase-qty-${item.item_id}`}
                    >+</button>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemove(item.item_id)}
                      data-testid={`remove-item-${item.item_id}`}
                    >🗑</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer with total */}
        {cart?.items?.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total ({cart.total_items} items)</span>
              <strong>₹{cart.total_price?.toFixed(2)}</strong>
            </div>
            <button className="checkout-btn" data-testid="checkout-btn">
              Proceed to Checkout
            </button>
            <button className="clear-cart-btn" onClick={handleClear} data-testid="clear-cart-btn">
              Clear Cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default CartSidebar;
