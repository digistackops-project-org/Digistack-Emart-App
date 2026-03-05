'use strict';
/**
 * Unit tests — Book Controller
 * Mocks BookModel so no real DB is needed.
 */

jest.mock('../../src/models/book');
jest.mock('../../src/utils/logger', () => ({
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const BookModel       = require('../../src/models/book');
const bookController  = require('../../src/controllers/bookController');

// ── Helper: build minimal Express req/res/next mocks ────────
function mockRes() {
  const res = {};
  res.status  = jest.fn().mockReturnValue(res);
  res.json    = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    params: {},
    body:   {},
    user:   { sub: 'user-123', email: 'test@example.com' },
    ...overrides,
  };
}

const next = jest.fn();

describe('BookController — getAllBooks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with all books', async () => {
    const books = [
      { id: 1, title: 'Clean Code', author: 'Bob', cost: '799.00' },
      { id: 2, title: 'Refactoring', author: 'Fowler', cost: '999.00' },
    ];
    BookModel.findAll.mockResolvedValue(books);

    const req = mockReq();
    const res = mockRes();

    await bookController.getAllBooks(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 2, data: books })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns empty array when no books exist', async () => {
    BookModel.findAll.mockResolvedValue([]);
    const req = mockReq();
    const res = mockRes();

    await bookController.getAllBooks(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 0, data: [] })
    );
  });

  it('calls next(err) on database error', async () => {
    const err = new Error('DB down');
    BookModel.findAll.mockRejectedValue(err);

    await bookController.getAllBooks(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('BookController — getBookById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 when book is found', async () => {
    const book = { id: 1, title: 'Clean Code', author: 'Bob', cost: '799.00' };
    BookModel.findById.mockResolvedValue(book);

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await bookController.getBookById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: book }));
  });

  it('returns 404 when book is not found', async () => {
    BookModel.findById.mockResolvedValue(null);

    const req = mockReq({ params: { id: '999' } });
    const res = mockRes();

    await bookController.getBookById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Book not found' })
    );
  });
});

describe('BookController — createBook', () => {
  beforeEach(() => jest.clearAllMocks());

  // Mock express-validator results
  const { validationResult } = require('express-validator');
  jest.mock('express-validator', () => ({
    ...jest.requireActual('express-validator'),
    validationResult: jest.fn(),
  }));

  it('returns 201 on successful creation', async () => {
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    const created = { id: 3, title: 'New Book', author: 'Alice', cost: '500.00' };
    BookModel.create.mockResolvedValue(created);

    const req = mockReq({ body: { title: 'New Book', author: 'Alice', cost: 500 } });
    const res = mockRes();

    await bookController.createBook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: created }));
  });

  it('returns 422 on validation errors', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array:   () => [{ param: 'title', msg: 'Title is required' }],
    });

    const req = mockReq({ body: {} });
    const res = mockRes();

    await bookController.createBook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Validation failed' })
    );
  });
});

describe('BookController — deleteBook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 when book is deleted', async () => {
    BookModel.delete.mockResolvedValue({ id: 1, title: 'Clean Code' });

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await bookController.deleteBook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Book deleted' })
    );
  });

  it('returns 404 when book does not exist', async () => {
    BookModel.delete.mockResolvedValue(null);

    const req = mockReq({ params: { id: '999' } });
    const res = mockRes();

    await bookController.deleteBook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
