import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import './Dashboard.css';

// ============================================================
// Sample products for each category
// (Will be replaced by real microservice calls in future phases)
// ============================================================
const SAMPLE_PRODUCTS = {
  books: [
    { product_id: 'b001', product_name: 'Clean Code',                  price: 699,  image_url: '📘', rating: 4.8 },
    { product_id: 'b002', product_name: 'The Pragmatic Programmer',    price: 799,  image_url: '📗', rating: 4.9 },
    { product_id: 'b003', product_name: 'Design Patterns',             price: 899,  image_url: '📙', rating: 4.7 },
    { product_id: 'b004', product_name: 'System Design Interview',     price: 549,  image_url: '📕', rating: 4.6 },
  ],
  courses: [
    { product_id: 'c001', product_name: 'React 18 Masterclass',        price: 2999, image_url: '⚛️', rating: 4.9 },
    { product_id: 'c002', product_name: 'Spring Boot Complete',        price: 2499, image_url: '🍃', rating: 4.8 },
    { product_id: 'c003', product_name: 'Go Programming',              price: 1999, image_url: '🐹', rating: 4.7 },
    { product_id: 'c004', product_name: 'Kubernetes for Devs',         price: 3499, image_url: '☸️', rating: 4.9 },
  ],
  software: [
    { product_id: 's001', product_name: 'JetBrains All Products',      price: 9999, image_url: '🔧', rating: 4.9 },
    { product_id: 's002', product_name: 'GitHub Copilot 1yr',          price: 8999, image_url: '🤖', rating: 4.8 },
    { product_id: 's003', product_name: 'Adobe Creative Suite',        price: 4999, image_url: '🎨', rating: 4.7 },
    { product_id: 's004', product_name: 'VS Code Pro License',         price: 2499, image_url: '💻', rating: 4.6 },
  ],
};

const CATEGORIES = [
  { id: 'books',    label: 'Books',    icon: '📚', color: '#10B981', bg: '#ECFDF5', description: 'Programming & Tech Books' },
  { id: 'courses',  label: 'Courses',  icon: '🎓', color: '#3B82F6', bg: '#EFF6FF', description: 'Online Learning Courses'  },
  { id: 'software', label: 'Software', icon: '💻', color: '#8B5CF6', bg: '#F5F3FF', description: 'Software Licenses & Tools' },
];

function Dashboard() {
  const { user }     = useAuth();
  const { addItem }  = useCart();
  const [activeCategory, setActiveCategory] = useState('books');
  const [addingItem,     setAddingItem]      = useState(null);

  const firstName = user?.name?.split(' ')[0] || 'there';

  const handleAddToCart = async (product, category) => {
    setAddingItem(product.product_id);
    try {
      await addItem({
        product_id:   product.product_id,
        product_name: product.product_name,
        category,
        price:    product.price,
        quantity: 1,
        image_url: product.image_url,
      });
      toast.success(`"${product.product_name}" added to cart! 🛒`);
    } catch {
      toast.error('Failed to add item to cart');
    } finally {
      setAddingItem(null);
    }
  };

  // FIX: currency is INR, format as Indian Rupee
  const formatPrice = (p) =>
    new Intl.NumberFormat('en-IN', {
      style:              'currency',
      currency:           'INR',
      maximumFractionDigits: 0,
    }).format(p);

  const activeProducts = SAMPLE_PRODUCTS[activeCategory] || [];
  const activeConfig   = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="dashboard">
      {/* Welcome Banner */}
      <div className="dashboard-banner">
        <div className="banner-content">
          <h1>Welcome back, <span className="banner-name">{firstName}</span>! 👋</h1>
          <p>Explore our top picks across Books, Courses &amp; Software</p>
        </div>
        <div className="banner-decoration">🚀</div>
      </div>

      {/* Category Selector */}
      <section className="category-section">
        <h2 className="section-title">Browse by Category</h2>
        <div className="category-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`category-tab ${activeCategory === cat.id ? 'category-tab--active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              data-testid={`category-tab-${cat.id}`}
              style={{ '--cat-color': cat.color, '--cat-bg': cat.bg }}
            >
              <span className="cat-tab-icon">{cat.icon}</span>
              <div>
                <p className="cat-tab-label">{cat.label}</p>
                <p className="cat-tab-desc">{cat.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="products-section">
        <div className="products-header">
          <h2 className="section-title">
            {activeConfig?.icon} Popular {activeConfig?.label}
          </h2>
          <span className="coming-soon-note">
            🔌 Full {activeConfig?.label} microservice coming in Phase 2
          </span>
        </div>

        <div className="products-grid" data-testid="products-grid">
          {activeProducts.map(product => (
            <div className="product-card" key={product.product_id} data-testid="product-card">
              <div className="product-image" style={{ background: activeConfig?.bg }}>
                <span>{product.image_url}</span>
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.product_name}</h3>
                <div className="product-meta">
                  <span
                    className="product-category-tag"
                    style={{ color: activeConfig?.color, background: activeConfig?.bg }}
                  >
                    {activeCategory}
                  </span>
                  <span className="product-rating">⭐ {product.rating}</span>
                </div>
                <p className="product-price">{formatPrice(product.price)}</p>
                <button
                  className="add-to-cart-btn"
                  onClick={() => handleAddToCart(product, activeCategory)}
                  disabled={addingItem === product.product_id}
                  data-testid="add-to-cart"
                  style={{ '--btn-color': activeConfig?.color }}
                >
                  {addingItem === product.product_id ? (
                    <><span className="btn-spinner">⟳</span> Adding...</>
                  ) : (
                    <>🛒 Add to Cart</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
