// ============================================================
// tests/integration/books.integration.test.js
// Integration tests using Supertest against the Express app.
// Requires a real PostgreSQL test database:
//   DB_NAME=booksdb_test (all other vars from .env.test)
//
// Setup before running:
//   createdb booksdb_test
//   DB_NAME=booksdb_test bash db/run-flyway.sh migrate
//
// Run: npm run test:integration
// ============================================================
'use strict';

const request = require('supertest');
const jwt     = require('jsonwebtoken');

// Use test config BEFORE requiring app
process.env.NODE_ENV    = 'test';
process.env.PORT        = '0';     // random port (supertest handles it)
process.env.JWT_SECRET  = 'integration_test_jwt_secret_emart_2024';
process.env.DB_HOST     = process.env.TEST_DB_HOST     || 'localhost';
process.env.DB_PORT     = process.env.TEST_DB_PORT     || '5432';
process.env.DB_NAME     = process.env.TEST_DB_NAME     || 'booksdb_test';
process.env.DB_USER     = process.env.TEST_DB_USER     || 'emart_books';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || '';

const app = require('../../src/app');
const db  = require('../../src/config/database');

// ── Generate a test JWT (same format as Login Service) ────────
function generateTestToken(overrides = {}) {
  return jwt.sign(
    {
      userId: 'test-user-id-001',
      sub:    'testuser@emart.com',
      name:   'Test User',
      roles:  ['ROLE_USER'],
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );
}

const TOKEN = generateTestToken();
const AUTH  = `Bearer ${TOKEN}`;

// ── Test database setup / teardown ────────────────────────────
beforeAll(async () => {
  // Clean test data (preserve flyway_schema_history)
  await db.query('DELETE FROM books WHERE name LIKE $1', ['__test_%']);
});

afterAll(async () => {
  await db.query('DELETE FROM books WHERE name LIKE $1', ['__test_%']);
  await db.close();
});

// ============================================================
// Health endpoints (no auth)
// ============================================================
describe('Health Endpoints', () => {
  describe('GET /health', () => {
    it('returns 200 with status UP', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.service).toBeDefined();
    });
  });

  describe('GET /health/live', () => {
    it('returns 200 liveness UP', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.probe).toBe('liveness');
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 with postgresql UP check', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.probe).toBe('readiness');
      expect(res.body.checks).toHaveProperty('postgresql', 'UP');
    });
  });
});

// ============================================================
// Authentication middleware
// ============================================================
describe('Authentication', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/v1/books');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', 'Bearer this-is-not-a-valid-jwt');
    expect(res.status).toBe(401);
  });

  it('returns 401 for expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: 'u1', sub: 'u@e.com', roles: ['ROLE_USER'] },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });
});

// ============================================================
// GET /api/v1/books
// ============================================================
describe('GET /api/v1/books', () => {
  it('returns 200 with books array', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('response has correct book fields', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', AUTH);
    if (res.body.data.books.length > 0) {
      const book = res.body.data.books[0];
      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('name');
      expect(book).toHaveProperty('author');
      expect(book).toHaveProperty('cost');
    }
  });

  it('filters by category query param', async () => {
    const res = await request(app)
      .get('/api/v1/books?category=programming')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    if (res.body.data.books.length > 0) {
      res.body.data.books.forEach(b => {
        expect(b.category).toBe('programming');
      });
    }
  });
});

// ============================================================
// POST /api/v1/books — Create
// ============================================================
describe('POST /api/v1/books', () => {
  let createdBookId;

  const newBook = {
    name:        '__test_Integration Book',
    author:      '__test_Author',
    cost:        299.99,
    description: 'Created by integration test',
    category:    'general',
    stock:       10,
  };

  it('creates a book and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', AUTH)
      .send(newBook);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(newBook.name);
    expect(res.body.data.author).toBe(newBook.author);
    expect(parseFloat(res.body.data.cost)).toBe(newBook.cost);
    expect(res.body.data.id).toBeDefined();

    createdBookId = res.body.data.id;
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', AUTH)
      .send({ author: 'Author', cost: 100 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('name');
  });

  it('returns 400 when cost is negative', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', AUTH)
      .send({ name: 'Book', author: 'Author', cost: -50 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('cost');
  });

  it('returns 400 when author is missing', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', AUTH)
      .send({ name: 'Book', cost: 100 });
    expect(res.status).toBe(400);
  });

  // Cleanup
  afterAll(async () => {
    if (createdBookId) {
      await db.query('DELETE FROM books WHERE id = $1', [createdBookId]);
    }
  });
});

// ============================================================
// GET /api/v1/books/:id
// ============================================================
describe('GET /api/v1/books/:id', () => {
  let bookId;

  beforeAll(async () => {
    const result = await db.query(
      `INSERT INTO books (name, author, cost, category, is_active)
       VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
      ['__test_GetById', '__test_Author', 199.00, 'general']
    );
    bookId = result.rows[0].id;
  });

  afterAll(async () => {
    await db.query('DELETE FROM books WHERE id = $1', [bookId]);
  });

  it('returns 200 and correct book', async () => {
    const res = await request(app)
      .get(`/api/v1/books/${bookId}`)
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(bookId);
    expect(res.body.data.name).toBe('__test_GetById');
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await request(app)
      .get('/api/v1/books/999999')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PUT /api/v1/books/:id — Update
// ============================================================
describe('PUT /api/v1/books/:id', () => {
  let bookId;

  beforeAll(async () => {
    const result = await db.query(
      `INSERT INTO books (name, author, cost, category, is_active)
       VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
      ['__test_Update Book', '__test_Orig Author', 100.00, 'general']
    );
    bookId = result.rows[0].id;
  });

  afterAll(async () => {
    await db.query('DELETE FROM books WHERE id = $1', [bookId]);
  });

  it('updates name and cost and returns 200', async () => {
    const res = await request(app)
      .put(`/api/v1/books/${bookId}`)
      .set('Authorization', AUTH)
      .send({ name: '__test_Updated Name', cost: 150.00 });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('__test_Updated Name');
    expect(parseFloat(res.body.data.cost)).toBe(150.00);
  });

  it('returns 404 for non-existent book', async () => {
    const res = await request(app)
      .put('/api/v1/books/999999')
      .set('Authorization', AUTH)
      .send({ name: 'Updated' });
    expect(res.status).toBe(404);
  });
});

// ============================================================
// DELETE /api/v1/books/:id
// ============================================================
describe('DELETE /api/v1/books/:id', () => {
  let bookId;

  beforeAll(async () => {
    const result = await db.query(
      `INSERT INTO books (name, author, cost, category, is_active)
       VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
      ['__test_Delete Book', '__test_Author', 50.00, 'general']
    );
    bookId = result.rows[0].id;
  });

  it('soft-deletes book and returns 200', async () => {
    const res = await request(app)
      .delete(`/api/v1/books/${bookId}`)
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('book is hidden from GET list after delete', async () => {
    const res = await request(app)
      .get(`/api/v1/books/${bookId}`)
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 404 deleting already-deleted book', async () => {
    const res = await request(app)
      .delete(`/api/v1/books/${bookId}`)
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});
