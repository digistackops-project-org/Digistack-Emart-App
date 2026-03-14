// ============================================================
// tests/unit/bookController.unit.test.js
// Unit tests for Book Controller.
// ALL dependencies (db, logger) are mocked — NO real DB needed.
// Run: npm run test:unit
// ============================================================
'use strict';

jest.mock('../../src/config/database');
jest.mock('../../src/utils/logger', () => ({
  info:  jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn:  jest.fn(),
}));
// Prevent config from throwing if JWT_SECRET not set
jest.mock('../../src/config/config', () => ({
  app: { name: 'test-books', version: '1.0.0', env: 'test', port: 8082 },
  db:  { host: 'localhost', port: 5432, database: 'booksdb_test', user: 'test', password: '', pool: { min: 1, max: 5, idle: 10000 }, ssl: false },
  jwt: { secret: 'test_secret_for_unit_tests_only', algorithm: 'HS256' },
  log: { level: 'debug', file: null },
}));

const db = require('../../src/config/database');
const bookController = require('../../src/controllers/bookController');

// ── Request / Response mocks ──────────────────────────────────
const mockReq = (overrides = {}) => ({
  body:   {},
  params: {},
  query:  {},
  user:   { userId: 'user-123', email: 'test@emart.com', roles: ['ROLE_USER'] },
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// ── Sample book data ──────────────────────────────────────────
const sampleBook = {
  id:          1,
  name:        'Clean Code',
  author:      'Robert C. Martin',
  cost:        699.00,
  description: 'A handbook of agile software craftsmanship',
  isbn:        '978-0132350884',
  category:    'programming',
  stock:       50,
  image_url:   null,
  is_active:   true,
  created_at:  new Date().toISOString(),
  updated_at:  new Date().toISOString(),
};

// ── Reset mocks before each test ──────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockNext.mockClear();
});

// ============================================================
// getAllBooks
// ============================================================
describe('getAllBooks', () => {
  it('returns empty array when no books exist', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // books query
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 }); // count

    const req = mockReq({ query: {} });
    const res = mockRes();

    await bookController.getAllBooks(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ books: [], total: 0 }),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns list of books with correct shape', async () => {
    const books = [sampleBook, { ...sampleBook, id: 2, name: 'Pragmatic Programmer' }];
    db.query
      .mockResolvedValueOnce({ rows: books, rowCount: 2 })
      .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

    const req = mockReq({ query: {} });
    const res = mockRes();

    await bookController.getAllBooks(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.books).toHaveLength(2);
    expect(jsonArg.data.total).toBe(2);
    expect(jsonArg.data.books[0]).toHaveProperty('name', 'Clean Code');
  });

  it('filters by category when provided', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleBook], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });

    const req = mockReq({ query: { category: 'programming' } });
    const res = mockRes();

    await bookController.getAllBooks(req, res, mockNext);

    // First call should include category in params
    const firstCall = db.query.mock.calls[0];
    expect(firstCall[0]).toContain('AND category =');
    expect(firstCall[1]).toContain('programming');
  });

  it('passes error to next() on DB failure', async () => {
    const dbError = new Error('DB connection refused');
    db.query.mockRejectedValueOnce(dbError);

    const req = mockReq({ query: {} });
    const res = mockRes();

    await bookController.getAllBooks(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(dbError);
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ============================================================
// getBookById
// ============================================================
describe('getBookById', () => {
  it('returns 200 and book when found', async () => {
    db.query.mockResolvedValueOnce({ rows: [sampleBook], rowCount: 1 });

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await bookController.getBookById(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data:    expect.objectContaining({ name: 'Clean Code' }),
      })
    );
  });

  it('returns 404 when book not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = mockReq({ params: { id: '999' } });
    const res = mockRes();

    await bookController.getBookById(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('999') })
    );
  });

  it('returns 400 for invalid ID', async () => {
    const req = mockReq({ params: { id: 'abc' } });
    const res = mockRes();

    await bookController.getBookById(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('passes error to next() on DB failure', async () => {
    db.query.mockRejectedValueOnce(new Error('timeout'));
    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();
    await bookController.getBookById(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

// ============================================================
// createBook
// ============================================================
describe('createBook', () => {
  // express-validator requires req to have a validationResult
  // We mock it so validationResult() returns empty errors
  const { validationResult } = require('express-validator');
  jest.mock('express-validator', () => ({
    ...jest.requireActual('express-validator'),
    validationResult: jest.fn(),
  }));

  beforeEach(() => {
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
  });

  it('creates a book and returns 201', async () => {
    db.query.mockResolvedValueOnce({ rows: [sampleBook], rowCount: 1 });

    const req = mockReq({
      body: {
        name:        'Clean Code',
        author:      'Robert C. Martin',
        cost:        699,
        description: 'A great book',
        category:    'programming',
      },
    });
    const res = mockRes();

    await bookController.createBook(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ name: 'Clean Code' }) })
    );
  });

  it('returns 400 when validation fails', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ path: 'name', msg: 'Name is required' }],
    });

    const req = mockReq({ body: {} });
    const res = mockRes();

    await bookController.createBook(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Validation failed' })
    );
  });

  it('passes DB error to next()', async () => {
    db.query.mockRejectedValueOnce(new Error('Insert failed'));
    const req = mockReq({ body: { name: 'Book', author: 'Author', cost: 100 } });
    const res = mockRes();
    await bookController.createBook(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

// ============================================================
// deleteBook
// ============================================================
describe('deleteBook', () => {
  it('soft-deletes and returns 200', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Clean Code' }], rowCount: 1,
    });

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await bookController.deleteBook(req, res, mockNext);

    const sqlCall = db.query.mock.calls[0][0];
    expect(sqlCall).toContain('is_active = FALSE');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 if book not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const req = mockReq({ params: { id: '999' } });
    const res = mockRes();
    await bookController.deleteBook(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
