// ============================================================
// tests/api/books.api.test.js
// API tests against a deployed (running) Books Service.
// Requires: real server + real DB + valid JWT token.
//
// Usage:
//   API_BASE_URL=http://localhost:8082 \
//   JWT_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
//     -H 'Content-Type: application/json' \
//     -d '{"email":"admin@emart.com","password":"Admin@Emart#2024"}' \
//     | python3 -m json.tool | grep '"token"' | awk -F'"' '{print $4}') \
//   npm run test:api
//
// Or with explicit token:
//   API_BASE_URL=http://server-ip:8082 JWT_TOKEN=<your-token> npm run test:api
// ============================================================
'use strict';

const request = require('supertest');
const http    = require('http');

// ── Configuration ─────────────────────────────────────────────
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8082';
const JWT_TOKEN    = process.env.JWT_TOKEN;

if (!JWT_TOKEN) {
  console.error('\n❌ JWT_TOKEN environment variable is required for API tests.');
  console.error('   Get a token: POST /api/v1/auth/login with admin credentials\n');
  process.exit(1);
}

const AUTH = `Bearer ${JWT_TOKEN}`;

// Parse base URL for supertest
const url = new URL(API_BASE_URL);
const agent = request(`${url.protocol}//${url.host}`);
const PREFIX = url.pathname.replace(/\/$/, ''); // e.g. '' or '/books-api'

function apiPath(path) {
  return `${PREFIX}${path}`;
}

// Track created IDs for cleanup
const createdIds = [];

// ── Test suite ────────────────────────────────────────────────

// ============================================================
// H001 — GET /health
// ============================================================
describe('H001 GET /health', () => {
  it('returns 200 status UP (no auth required)', async () => {
    const res = await agent.get(apiPath('/health'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toMatch(/books/i);
    expect(res.body.timestamp).toBeDefined();
  });
});

// ============================================================
// H002 — GET /health/live
// ============================================================
describe('H002 GET /health/live', () => {
  it('returns 200 liveness UP (no auth)', async () => {
    const res = await agent.get(apiPath('/health/live'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.probe).toBe('liveness');
  });
});

// ============================================================
// H003 — GET /health/ready
// ============================================================
describe('H003 GET /health/ready', () => {
  it('returns 200 readiness UP with postgresql check', async () => {
    const res = await agent.get(apiPath('/health/ready'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.probe).toBe('readiness');
    expect(res.body.checks.postgresql).toBe('UP');
  });
});

// ============================================================
// B001 — GET /api/v1/books
// ============================================================
describe('B001 GET /api/v1/books — List books', () => {
  it('returns 200 with books array', async () => {
    const res = await agent
      .get(apiPath('/api/v1/books'))
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
  });

  it('returns correct metadata fields', async () => {
    const res = await agent
      .get(apiPath('/api/v1/books'))
      .set('Authorization', AUTH);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('returned');
    expect(res.body.data).toHaveProperty('limit');
  });

  it('each book has required card fields', async () => {
    const res = await agent
      .get(apiPath('/api/v1/books'))
      .set('Authorization', AUTH);
    if (res.body.data.books.length > 0) {
      const book = res.body.data.books[0];
      // Fields used in card display
      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('name');    // 50% of card
      expect(book).toHaveProperty('author');  // 20% of card
      expect(book).toHaveProperty('cost');    // 20% of card
    }
  });

  it('returns 401 without token', async () => {
    const res = await agent.get(apiPath('/api/v1/books'));
    expect(res.status).toBe(401);
  });
});

// ============================================================
// B002 — POST /api/v1/books — Create book
// ============================================================
describe('B002 POST /api/v1/books — Create book', () => {
  it('creates book and returns 201', async () => {
    const payload = {
      name:        `__api_test_book_${Date.now()}`,
      author:      'API Test Author',
      cost:        199.99,
      description: 'Created by API test suite',
      category:    'general',
      stock:       5,
    };

    const res = await agent
      .post(apiPath('/api/v1/books'))
      .set('Authorization', AUTH)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(payload.name);
    expect(res.body.data.author).toBe(payload.author);
    expect(parseFloat(res.body.data.cost)).toBe(payload.cost);
    expect(res.body.data.id).toBeDefined();

    createdIds.push(res.body.data.id);
  });

  it('returns 400 when name is missing', async () => {
    const res = await agent
      .post(apiPath('/api/v1/books'))
      .set('Authorization', AUTH)
      .send({ author: 'Author Only', cost: 100 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 400 when cost is negative', async () => {
    const res = await agent
      .post(apiPath('/api/v1/books'))
      .set('Authorization', AUTH)
      .send({ name: 'Book', author: 'Author', cost: -10 });
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await agent
      .post(apiPath('/api/v1/books'))
      .send({ name: 'Book', author: 'Author', cost: 100 });
    expect(res.status).toBe(401);
  });
});

// ============================================================
// B003 — GET /api/v1/books/:id
// ============================================================
describe('B003 GET /api/v1/books/:id — Get single book', () => {
  let testBookId;

  beforeAll(async () => {
    const res = await agent
      .post(apiPath('/api/v1/books'))
      .set('Authorization', AUTH)
      .send({ name: `__api_getbyid_${Date.now()}`, author: 'Author', cost: 50 });
    testBookId = res.body.data?.id;
    if (testBookId) createdIds.push(testBookId);
  });

  it('returns 200 with book data', async () => {
    if (!testBookId) return;
    const res = await agent
      .get(apiPath(`/api/v1/books/${testBookId}`))
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(testBookId);
  });

  it('returns 404 for non-existent book', async () => {
    const res = await agent
      .get(apiPath('/api/v1/books/999999999'))
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});

// ============================================================
// B004 — PUT /api/v1/books/:id — Update
// ============================================================
describe('B004 PUT /api/v1/books/:id — Update book', () => {
  let testBookId;

  beforeAll(async () => {
    const res = await agent
      .post(apiPath('/api/v1/books'))
      .set('Authorization', AUTH)
      .send({ name: `__api_update_${Date.now()}`, author: 'Old Author', cost: 100 });
    testBookId = res.body.data?.id;
    if (testBookId) createdIds.push(testBookId);
  });

  it('updates fields and returns 200', async () => {
    if (!testBookId) return;
    const res = await agent
      .put(apiPath(`/api/v1/books/${testBookId}`))
      .set('Authorization', AUTH)
      .send({ author: 'New Author', cost: 150.00 });
    expect(res.status).toBe(200);
    expect(res.body.data.author).toBe('New Author');
    expect(parseFloat(res.body.data.cost)).toBe(150.00);
  });

  it('returns 404 for non-existent book', async () => {
    const res = await agent
      .put(apiPath('/api/v1/books/999999999'))
      .set('Authorization', AUTH)
      .send({ name: 'Updated' });
    expect(res.status).toBe(404);
  });
});

// ============================================================
// B005 — DELETE /api/v1/books/:id
// ============================================================
describe('B005 DELETE /api/v1/books/:id — Delete book', () => {
  let testBookId;

  beforeAll(async () => {
    const res = await agent
      .post(apiPath('/api/v1/books'))
      .set('Authorization', AUTH)
      .send({ name: `__api_delete_${Date.now()}`, author: 'Author', cost: 75 });
    testBookId = res.body.data?.id;
    // don't push to createdIds — we're testing delete here
  });

  it('deletes book and returns 200', async () => {
    if (!testBookId) return;
    const res = await agent
      .delete(apiPath(`/api/v1/books/${testBookId}`))
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('deleted book returns 404 on GET', async () => {
    if (!testBookId) return;
    const res = await agent
      .get(apiPath(`/api/v1/books/${testBookId}`))
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});

// ── Cleanup test-created books ────────────────────────────────
afterAll(async () => {
  for (const id of createdIds) {
    try {
      await agent
        .delete(apiPath(`/api/v1/books/${id}`))
        .set('Authorization', AUTH);
    } catch (_) {
      // Best-effort cleanup
    }
  }
  console.log(`\nAPI Test cleanup: removed ${createdIds.length} test books`);
});
