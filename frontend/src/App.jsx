import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider }          from './context/CartContext';
import Login        from './components/auth/Login';
import Signup       from './components/auth/Signup';
import AppHeader    from './components/layout/AppHeader';
import Dashboard    from './components/common/Dashboard';
import BooksPage    from './components/books/BooksPage';
import CoursesPage  from './components/courses/CoursesPage';
import ProfilePage  from './components/profile/ProfilePage';   // Phase 7 ✅
import CheckoutPage from './components/checkout/CheckoutPage';
import OrdersPage   from './components/checkout/OrdersPage';

// ── Placeholder for routes not yet implemented ────────────────
function ComingSoon({ service }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', color: '#6B7280'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚧</div>
      <h2 style={{ color: '#111827', margin: '0 0 8px' }}>
        {service.charAt(0).toUpperCase() + service.slice(1)} — Coming Soon
      </h2>
      <p style={{ margin: 0, fontSize: '.9rem' }}>
        This service will be available in a future phase.
      </p>
    </div>
  );
}

function AuthenticatedLayout() {
  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main" style={{ paddingTop: 64 }}>
        <Outlet />
      </main>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading…</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* ── Authenticated ── */}
          <Route element={
            <PrivateRoute>
              <CartProvider>
                <AuthenticatedLayout />
              </CartProvider>
            </PrivateRoute>
          }>
            <Route path="/dashboard"       element={<Dashboard />} />
            <Route path="/books"           element={<BooksPage />} />
            <Route path="/courses"         element={<CoursesPage />} />
            <Route path="/software"        element={<ComingSoon service="software" />} />
            <Route path="/profile"         element={<ProfilePage />} />  {/* Phase 7 ✅ */}
            <Route path="/admin"           element={<ComingSoon service="admin" />} />
            <Route path="/checkout"        element={<CheckoutPage />} />
            <Route path="/orders"          element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrdersPage />} />
          </Route>

          {/* ── Fallback ── */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false}
          newestOnTop closeOnClick pauseOnHover theme="light" />
      </Router>
    </AuthProvider>
  );
}

export default App;
