import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi } from '../services/cartApi';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, token } = useAuth();
  const [cart, setCart] = useState(null);
  const [cartSummary, setCartSummary] = useState({ total_items: 0, total_amount: 0, currency: 'INR' });
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Fetch cart summary (lightweight - for header badge)
  const fetchCartSummary = useCallback(async () => {
    if (!token) return;
    try {
      const res = await cartApi.getSummary();
      if (res.data?.success) {
        setCartSummary(res.data.data);
      }
    } catch (_) {
      // Silently fail summary - not critical
    }
  }, [token]);

  // Fetch full cart
  const fetchCart = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await cartApi.getCart();
      if (res.data?.success) {
        setCart(res.data.data);
        setCartSummary({
          total_items: res.data.data.total_items || 0,
          total_amount: res.data.data.total_amount || 0,
          currency: res.data.data.currency || 'INR',
        });
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load summary when user logs in
  useEffect(() => {
    if (user && token) {
      fetchCartSummary();
    } else {
      setCart(null);
      setCartSummary({ total_items: 0, total_amount: 0, currency: 'INR' });
    }
  }, [user, token, fetchCartSummary]);

  const addItem = useCallback(async (item) => {
    const res = await cartApi.addItem(item);
    if (res.data?.success) {
      setCart(res.data.data);
      setCartSummary({
        total_items: res.data.data.total_items || 0,
        total_amount: res.data.data.total_amount || 0,
        currency: res.data.data.currency || 'INR',
      });
    }
    return res.data;
  }, []);

  const updateItem = useCallback(async (itemId, quantity) => {
    const res = await cartApi.updateItem(itemId, quantity);
    if (res.data?.success) {
      setCart(res.data.data);
      setCartSummary({
        total_items: res.data.data.total_items || 0,
        total_amount: res.data.data.total_amount || 0,
        currency: 'INR',
      });
    }
    return res.data;
  }, []);

  const removeItem = useCallback(async (itemId) => {
    const res = await cartApi.removeItem(itemId);
    if (res.data?.success) {
      setCart(res.data.data);
      setCartSummary({
        total_items: res.data.data.total_items || 0,
        total_amount: res.data.data.total_amount || 0,
        currency: 'INR',
      });
    }
    return res.data;
  }, []);

  const clearCart = useCallback(async () => {
    await cartApi.clearCart();
    setCart(null);
    setCartSummary({ total_items: 0, total_amount: 0, currency: 'INR' });
  }, []);

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
