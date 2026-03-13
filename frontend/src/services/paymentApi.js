// src/services/paymentApi.js
// ============================================================
// Axios client for the Payment/Checkout Service.
// Base URL: /payment-api/api/v1  (Nginx → localhost:8084)
// JWT injected automatically from localStorage.
// ============================================================
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PAYMENT_API_URL || '/payment-api/api/v1';

const client = axios.create({ baseURL: BASE_URL });

// Attach JWT on every request
client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

// Auto-logout on 401
client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

const paymentApi = {
  /**
   * POST /checkout
   * Body: { shippingAddress, paymentMethod, paymentDetails?, notes? }
   * Returns: OrderResponse (status=PENDING, awaiting payment)
   */
  checkout: (data) => client.post('/checkout', data),

  /**
   * POST /payments/{orderId}/process
   * Body: { upiId? } | { cardNumber?, cardHolder?, cardExpiry? } | {}
   * Returns: PaymentResult
   */
  processPayment: (orderId, paymentDetails) =>
    client.post(`/payments/${orderId}/process`, paymentDetails || {}),

  /**
   * GET /orders
   * Returns: OrderResponse[] sorted newest-first
   */
  getOrders: () => client.get('/orders'),

  /**
   * GET /orders/{orderId}
   * Returns: OrderResponse (single)
   */
  getOrder: (orderId) => client.get(`/orders/${orderId}`),

  /** GET /health/ready — used for deploy health checks */
  healthReady: () => client.get('/../../health/ready'),
};

export default paymentApi;
