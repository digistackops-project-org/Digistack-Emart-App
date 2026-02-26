import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('emart_token');
    const storedUser = localStorage.getItem('emart_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (_) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((tokenVal, userData) => {
    localStorage.setItem('emart_token', tokenVal);
    localStorage.setItem('emart_user', JSON.stringify(userData));
    setToken(tokenVal);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('emart_token');
    localStorage.removeItem('emart_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
