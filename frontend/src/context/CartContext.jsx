import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi } from '../services/cartApi';    // named export cartApi
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, token } = useAuth();

  const [cart,        setCart]        = useState(null);
  // FIX: Go backend returns total_price, not total_amount
  const [cartSummary, setCartSummary] = useState({ total_items: 0, total_price: 0.0 });
  const [loading,     setLoading]     = useState(false);
  const [cartOpen,    setCartOpen]    = useState(false);

  // ── Helpers ──────────────────────────────────────────────
  const extractSummary = (cartData) => ({
    total_items: cartData?.total_items ?? 0,
    total_price: cartData?.total_price ?? 0.0,
  });

  // ── Fetch lightweight summary (header badge) ─────────────
  const fetchCartSummary = useCallback(async () => {
    if (!token) return;
    try {
      // FIX: cartApi.getSummary() matches cartApi.js export
      const res = await cartApi.getSummary();
      if (res.data?.success) {
        setCartSummary(extractSummary(res.data.data));
      }
    } catch (_) {
      // Silently fail – badge stays at 0
    }
  }, [token]);

  // ── Fetch full cart (opened drawer) ──────────────────────
  const fetchCart = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await cartApi.getCart();
      if (res.data?.success) {
        setCart(res.data.data);
        setCartSummary(extractSummary(res.data.data));
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load summary when user logs in / token changes
  useEffect(() => {
    if (user && token) {
      fetchCartSummary();
    } else {
      setCart(null);
      setCartSummary({ total_items: 0, total_price: 0.0 });
    }
  }, [user, token, fetchCartSummary]);

  // ── Cart mutations ────────────────────────────────────────
  const addItem = useCallback(async (item) => {
    const res = await cartApi.addItem(item);
    if (res.data?.success) {
      setCart(res.data.data);
      setCartSummary(extractSummary(res.data.data));
    }
    return res.data;
  }, []);

  // FIX: cartApi.updateItem() matches cartApi.js export
  const updateItem = useCallback(async (itemId, quantity) => {
    const res = await cartApi.updateItem(itemId, quantity);
    if (res.data?.success) {
      setCart(res.data.data);
      setCartSummary(extractSummary(res.data.data));
    }
    return res.data;
  }, []);

  const removeItem = useCallback(async (itemId) => {
    const res = await cartApi.removeItem(itemId);
    if (res.data?.success) {
      setCart(res.data.data);
      setCartSummary(extractSummary(res.data.data));
    }
    return res.data;
  }, []);

  const clearCart = useCallback(async () => {
    await cartApi.clearCart();
    setCart(null);
    setCartSummary({ total_items: 0, total_price: 0.0 });
  }, []);

  // ── Drawer open/close ────────────────────────────────────
  const openCart = useCallback(() => {
    fetchCart();
    setCartOpen(true);
  }, [fetchCart]);

  const closeCart = useCallback(() => setCartOpen(false), []);

  return (
    <CartContext.Provider value={{
      cart, cartSummary, loading, cartOpen,
      fetchCart, fetchCartSummary,
      addItem, updateItem, removeItem, clearCart,
      openCart, closeCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}
