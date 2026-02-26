import axios from 'axios';

const CART_API_URL = process.env.REACT_APP_CART_API_URL || '/cart-api/api/v1';

const cartApi = axios.create({
  baseURL: CART_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
});

cartApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('emart_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

cartApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const cartService = {
  getCart: () => cartApi.get('/cart'),
  getCartSummary: () => cartApi.get('/cart/summary'),
  addItem: (item) => cartApi.post('/cart/items', item),
  updateQuantity: (itemId, quantity) => cartApi.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => cartApi.delete(`/cart/items/${itemId}`),
  clearCart: () => cartApi.delete('/cart'),
};

export default cartService;
