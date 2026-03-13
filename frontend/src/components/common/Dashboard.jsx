import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import paymentApi from '../../services/paymentApi';
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
  const navigate     = useNavigate();
  const [activeCategory, setActiveCategory] = useState('books');
  const [addingItem,     setAddingItem]      = useState(null);
  const [recentOrders,   setRecentOrders]    = useState([]);

  const firstName = user?.name?.split(' ')[0] || 'there';

  // Load last 3 orders for the dashboard widget
  useEffect(() => {
    paymentApi.getOrders()
      .then(res => setRecentOrders((res.data?.data || []).slice(0, 3)))
      .catch(() => {}); // silent — widget is non-critical
  }, []);

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
      {/* Recent Orders Widget */}
      {recentOrders.length > 0 && (
        <section className="products-section" style={{ marginTop: 32 }}>
          <div className="products-header">
            <h2 className="section-title">📦 Recent Orders</h2>
            <button
              style={{ background:'none', border:'none', color:'#3B82F6', fontWeight:600, cursor:'pointer', fontSize:'0.9rem' }}
              onClick={() => navigate('/orders')}
            >
              View All →
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
            {recentOrders.map(order => {
              const statusColor = { CONFIRMED:'#10B981', DELIVERED:'#10B981', PAYMENT_FAILED:'#EF4444', PENDING:'#F59E0B' }[order.status] || '#6B7280';
              const statusBg    = { CONFIRMED:'#D1FAE5', DELIVERED:'#DCFCE7', PAYMENT_FAILED:'#FEE2E2', PENDING:'#FEF3C7' }[order.status] || '#F3F4F6';
              const total       = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(order.totalAmount||0);
              return (
                <div key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'box-shadow 0.15s', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 14px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)'}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#111827' }}>{order.orderNumber}</div>
                    <span style={{ background:statusBg, color:statusColor, borderRadius:100, padding:'2px 10px', fontSize:'0.72rem', fontWeight:700 }}>
                      {order.status?.replace('_',' ')}
                    </span>
                  </div>
                  <div style={{ fontSize:'0.8rem', color:'#6B7280', marginBottom:6 }}>
                    {order.items?.slice(0,2).map(i=>i.productName).join(', ')}
                    {(order.items?.length||0) > 2 ? ` +${order.items.length-2} more` : ''}
                  </div>
                  <div style={{ fontWeight:700, color:'#1D4ED8', fontSize:'0.95rem' }}>{total}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
