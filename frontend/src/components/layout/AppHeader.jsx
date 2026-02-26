import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import CartDrawer from '../cart/CartDrawer';
import './Header.css';

// ============================================================
// Category nav items - each will be a microservice later
// ============================================================
const NAV_ITEMS = [
  {
    id: 'books',
    label: 'Books',
    route: '/books',
    icon: '📚',
    color: '#10B981',
    description: 'Browse our book collection',
    badge: null,
  },
  {
    id: 'courses',
    label: 'Courses',
    route: '/courses',
    icon: '🎓',
    color: '#3B82F6',
    description: 'Online learning courses',
    badge: 'New',
  },
  {
    id: 'software',
    label: 'Software',
    route: '/software',
    icon: '💻',
    color: '#8B5CF6',
    description: 'Software licenses & tools',
    badge: null,
  },
];

function AppHeader() {
  const { user, logout } = useAuth();
  const { cartSummary, openCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (item) => {
    // These routes will show "Coming Soon" until microservices are ready
    navigate(item.route);
  };

  const isActive = (route) => location.pathname.startsWith(route);

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <>
      <header className="app-header" data-testid="app-header">
        {/* ================================================
            LEFT: Brand logo
        ================================================ */}
        <div className="header-brand" onClick={() => navigate('/dashboard')}>
          <span className="brand-logo">E</span>
          <span className="brand-name">mart</span>
        </div>

        {/* ================================================
            CENTER: Navigation - Books, Courses, Software
        ================================================ */}
        <nav className="header-nav" data-testid="header-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${isActive(item.route) ? 'nav-btn--active' : ''}`}
              onClick={() => handleNavClick(item)}
              data-testid={`nav-${item.id}`}
              title={item.description}
              style={{ '--nav-color': item.color }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* ================================================
            RIGHT: Cart + User profile
        ================================================ */}
        <div className="header-actions">

          {/* Cart Button with item count badge */}
          <button
            className="cart-btn"
            onClick={openCart}
            data-testid="cart-button"
            aria-label={`Cart with ${cartSummary.total_items} items`}
          >
            <svg className="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {cartSummary.total_items > 0 && (
              <span className="cart-badge" data-testid="cart-badge">
                {cartSummary.total_items > 99 ? '99+' : cartSummary.total_items}
              </span>
            )}
          </button>

          {/* User profile dropdown */}
          <div className="profile-wrapper" data-testid="profile-wrapper">
            <button
              className="profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              data-testid="profile-button"
            >
              <div className="profile-avatar">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <span className="profile-name" data-testid="user-name">{firstName}</span>
              <svg className={`chevron ${profileOpen ? 'chevron--up' : ''}`}
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {profileOpen && (
              <div className="profile-dropdown" data-testid="profile-dropdown">
                <div className="profile-info">
                  <div className="profile-avatar profile-avatar--large">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="profile-full-name">{user?.name}</p>
                    <p className="profile-email">{user?.email}</p>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => navigate('/profile')}>
                  <span>👤</span> My Profile
                </button>
                <button className="dropdown-item" onClick={() => navigate('/orders')}>
                  <span>📦</span> My Orders
                </button>
                <button className="dropdown-item" onClick={() => openCart()}>
                  <span>🛒</span> My Cart
                  {cartSummary.total_items > 0 && (
                    <span className="dropdown-badge">{cartSummary.total_items}</span>
                  )}
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item dropdown-item--danger" onClick={handleLogout} data-testid="logout-btn">
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Cart Drawer (slides in from right) */}
      <CartDrawer />
    </>
  );
}

export default AppHeader;
