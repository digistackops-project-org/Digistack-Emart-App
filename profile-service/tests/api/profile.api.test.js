// tests/api/profile.api.test.js
// Prerequisites: Profile Service running on :8086, valid JWT in EMART_TEST_JWT
'use strict';
const request = require('supertest');
const app     = require('../../src/server');

const JWT = process.env.EMART_TEST_JWT || 'missing-jwt';

describe('Profile API', () => {
  describe('GET /health', () => {
    it('returns 200 UP', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });
  });

  describe('Authentication', () => {
    it('GET /api/v1/profile requires Bearer token', async () => {
      const res = await request(app).get('/api/v1/profile');
      expect(res.status).toBe(401);
    });

    it('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/profile', () => {
    it('returns or creates profile with valid JWT', async () => {
      if (JWT === 'missing-jwt') return;
      const res = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${JWT}`);
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/profile', () => {
    it('rejects invalid phone', async () => {
      if (JWT === 'missing-jwt') return;
      const res = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${JWT}`)
        .send({ phone: '12345' });
      expect(res.status).toBe(400);
    });

    it('updates valid field', async () => {
      if (JWT === 'missing-jwt') return;
      const res = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${JWT}`)
        .send({ bio: 'Test bio from API test' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/profile/addresses', () => {
    it('rejects invalid PIN', async () => {
      if (JWT === 'missing-jwt') return;
      const res = await request(app)
        .post('/api/v1/profile/addresses')
        .set('Authorization', `Bearer ${JWT}`)
        .send({ line1:'123 St', city:'BLR', state:'KA', pin_code:'000' });
      expect(res.status).toBe(400);
    });

    it('adds valid address', async () => {
      if (JWT === 'missing-jwt') return;
      const res = await request(app)
        .post('/api/v1/profile/addresses')
        .set('Authorization', `Bearer ${JWT}`)
        .send({ line1:'123 MG Road', city:'Bengaluru', state:'Karnataka', pin_code:'560001' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });
});
