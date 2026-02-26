import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartApi';
import CartSidebar from '../cart/CartSidebar';
import './Header.css';

function Header() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('emart_user') || '{}');
  const [cartSummary, setCartSummary] = useState({ total_items: 0, total_price: 0 });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  // Load cart summary on mount and when cart changes
  useEffect(() => {
    fetchCartSummary();
  }, []);

  const fetchCartSummary = async () => {
    try {
      const res = await cartService.getCartSummary();
      setCartSummary(res.data.data);
    } catch (err) {
      // Silently fail - cart count stays 0
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleNavClick = (section) => {
    setActiveTab(section);
    // Future: navigate to respective microservice pages
    // navigate(`/${section}`)  -- will be implemented in later phases
    alert(`${section.charAt(0).toUpperCase() + section.slice(1)} service coming soon in next phase!`);
  };

  return (
    <>
      <header className="app-header" data-testid="app-header">
        {/* Left: Logo */}
        <div className="header-logo">
          <span className="logo-text">Emart</span>
        </div>

        {/* Center: Navigation Buttons */}
        <nav className="header-nav" data-testid="header-nav">
          <button
            className={`nav-btn books-btn ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => handleNavClick('books')}
            data-testid="books-btn"
          >
            📚 Books
          </button>
          <button
            className={`nav-btn courses-btn ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => handleNavClick('courses')}
            data-testid="courses-btn"
          >
            🎓 Courses
          </button>
          <button
            className={`nav-btn software-btn ${activeTab === 'software' ? 'active' : ''}`}
            onClick={() => handleNavClick('software')}
            data-testid="software-btn"
          >
            💻 Software
          </button>
        </nav>

        {/* Right: User info + Cart */}
        <div className="header-right">
          {/* Cart Icon with Badge */}
          <button
            className="cart-btn"
            onClick={() => setIsCartOpen(true)}
            data-testid="cart-btn"
            aria-label={`Cart with ${cartSummary.total_items} items`}
          >
            <span className="cart-icon">🛒</span>
            {cartSummary.total_items > 0 && (
              <span className="cart-badge" data-testid="cart-badge">
                {cartSummary.total_items > 99 ? '99+' : cartSummary.total_items}
              </span>
            )}
          </button>

          {/* User Avatar + Name */}
          <div className="user-info" data-testid="user-info">
            <div className="user-avatar" data-testid="user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="user-name" data-testid="user-name">
              {user.name || 'User'}
            </span>
          </div>

          {/* Logout */}
          <button className="logout-btn" onClick={handleLogout} data-testid="logout-btn">
            Sign Out
          </button>
        </div>
      </header>

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => { setIsCartOpen(false); fetchCartSummary(); }}
        onCartUpdate={fetchCartSummary}
      />
    </>
  );
}

export default Header;
