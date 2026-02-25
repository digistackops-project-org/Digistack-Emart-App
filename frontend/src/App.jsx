import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';

// Simple auth guard
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('emart_token');
  return token ? children : <Navigate to="/login" replace />;
};

// Dashboard placeholder
const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('emart_user') || '{}');
  const logout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Welcome to Emart Dashboard, {user.name}!</h1>
      <p>Email: {user.email}</p>
      <button onClick={logout} style={{ marginTop: 20, padding: '10px 20px', cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
    </Router>
  );
}

export default App;
