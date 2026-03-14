// tests/api/notify.api.test.js
'use strict';
const request = require('supertest');
const app     = require('../../src/server');
const JWT     = process.env.EMART_TEST_JWT || 'missing-jwt';

describe('Notification API', () => {
  describe('GET /health', () => {
    it('returns 200 UP', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });
  });

  describe('Authentication', () => {
    it('POST /api/v1/notify/order-confirmed requires auth', async () => {
      const res = await request(app).post('/api/v1/notify/order-confirmed').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/notify/order-confirmed', () => {
    it('rejects missing fields', async () => {
      if (JWT === 'missing-jwt') return;
      const res = await request(app)
        .post('/api/v1/notify/order-confirmed')
        .set('Authorization', `Bearer ${JWT}`)
        .send({ orderNumber: 'EM-123' });  // missing userEmail
      expect(res.status).toBe(400);
    });

    it('sends order confirmation email', async () => {
      if (JWT === 'missing-jwt') return;
      const res = await request(app)
        .post('/api/v1/notify/order-confirmed')
        .set('Authorization', `Bearer ${JWT}`)
        .send({
          userEmail: 'test@emart.com', userName: 'Test User',
          orderNumber: 'EM-2024-TEST', totalAmount: 999,
          paymentMethod: 'UPI', transactionId: 'UPI-TEST',
          items: [{ productName:'Clean Code', quantity:1, price:499 }]
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/notify/test', () => {
    it('sends test email', async () => {
      if (JWT === 'missing-jwt') return;
      const res = await request(app)
        .post('/api/v1/notify/test')
        .set('Authorization', `Bearer ${JWT}`)
        .send({ to: 'test@emart.com', type: 'welcome' });
      expect(res.status).toBe(200);
    });
  });
});
