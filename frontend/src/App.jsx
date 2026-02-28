import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider }           from './context/CartContext';
import Login    from './components/auth/Login';
import Signup   from './components/auth/Signup';
import AppHeader from './components/layout/AppHeader';
import Dashboard from './components/common/Dashboard';

// ============================================================
// Layout: fixed header + scrollable main content area
// ============================================================
function AuthenticatedLayout() {
  return (
    <div className="app-layout">
      <AppHeader />
      {/* top-padding matches the fixed header height (64px) */}
      <main className="app-main" style={{ paddingTop: 64 }}>
        <Outlet />
      </main>
    </div>
  );
}

// ============================================================
// Guard: redirect to /login when not authenticated
// ============================================================
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

// ============================================================
// Guard: redirect to /dashboard when already authenticated
// ============================================================
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading...</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

// ============================================================
// Placeholder for future microservices (Phase 2+)
// ============================================================
function ComingSoon({ service }) {
  const meta = {
    books:    { icon: '📚', tech: 'NodeJS + PostgreSQL' },
    courses:  { icon: '🎓', tech: 'Python + MySQL'       },
    software: { icon: '💻', tech: 'Go + MongoDB'         },
  }[service] || { icon: '🔌', tech: 'TBD' };

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:'60vh', gap:20, color:'#6B7280',
    }}>
      <div style={{ fontSize:'5rem' }}>{meta.icon}</div>
      <h2 style={{ fontSize:'1.5rem', fontWeight:700, color:'#111827', margin:0 }}>
        {service.charAt(0).toUpperCase() + service.slice(1)} Microservice
      </h2>
      <p style={{ margin:0 }}>Coming in Phase 2 — {meta.tech}</p>
      <div style={{
        background:'#F3F4F6', borderRadius:12, padding:'12px 24px',
        fontSize:'0.875rem', color:'#9CA3AF',
      }}>
        🔌 This service will connect to the {service} microservice when ready
      </div>
    </div>
  );
}

// ============================================================
// Root App
// ============================================================
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public routes (login / signup) ── */}
          <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* ── Authenticated routes ── */}
          {/*   CartProvider wraps all authenticated pages so AppHeader can
                access cartSummary for the badge counter                    */}
          <Route
            element={
              <PrivateRoute>
                <CartProvider>
                  <AuthenticatedLayout />
                </CartProvider>
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/books"     element={<ComingSoon service="books" />} />
            <Route path="/courses"   element={<ComingSoon service="courses" />} />
            <Route path="/software"  element={<ComingSoon service="software" />} />
            <Route path="/profile"   element={<div style={{padding:40}}><h2>My Profile (coming soon)</h2></div>} />
            <Route path="/orders"    element={<div style={{padding:40}}><h2>My Orders (coming soon)</h2></div>} />
          </Route>

          {/* ── Fallback ── */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="light"
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
