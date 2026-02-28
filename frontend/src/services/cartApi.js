// ============================================================
// cartApi.js  –  Cart Service HTTP client
// Nginx proxies  /cart-api/*  →  localhost:8081  (cart-service)
// URL rewrite strips /cart-api prefix, so baseURL is /cart-api/api/v1
// ============================================================
import axios from 'axios';

const CART_BASE_URL = process.env.REACT_APP_CART_API_URL || '/cart-api/api/v1';

const cartAxios = axios.create({
  baseURL: CART_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
});

// Attach JWT token from localStorage on every request
cartAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('emart_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
cartAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('emart_token');
      localStorage.removeItem('emart_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ============================================================
// Named export: cartApi
// CartContext.jsx imports { cartApi } from '../services/cartApi'
// Method names align with CartContext usage
// ============================================================
export const cartApi = {
  // GET /api/v1/cart  → full cart with items
  getCart: () => cartAxios.get('/cart'),

  // GET /api/v1/cart/summary  → { total_items, total_price }
  getSummary: () => cartAxios.get('/cart/summary'),

  // POST /api/v1/cart/items  → cart after add
  addItem: (item) => cartAxios.post('/cart/items', item),

  // PUT /api/v1/cart/items/:itemId  → cart after update
  updateItem: (itemId, quantity) =>
    cartAxios.put(`/cart/items/${itemId}`, { quantity }),

  // DELETE /api/v1/cart/items/:itemId  → cart after remove
  removeItem: (itemId) => cartAxios.delete(`/cart/items/${itemId}`),

  // DELETE /api/v1/cart  → clears all items
  clearCart: () => cartAxios.delete('/cart'),
};

export default cartApi;
