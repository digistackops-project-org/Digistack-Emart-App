// ============================================================
// src/controllers/bookController.js
// Book CRUD operations against PostgreSQL booksdb.books table.
//
// Card layout spec (from product requirements):
//   50% - book name
//   20% - author
//   20% - cost
//   10% - "Add to Cart" button  (handled by frontend)
// ============================================================
'use strict';

const { validationResult } = require('express-validator');
const db     = require('../config/database');
const logger = require('../utils/logger');
const { handleValidationErrors, createError } = require('../middleware/errorHandler');

// ── SQL constants ─────────────────────────────────────────────
const SELECT_FIELDS = `
  id, name, author, cost, description, isbn,
  category, stock, image_url, is_active,
  created_at, updated_at
`;

// ── Response helpers ──────────────────────────────────────────
const ok = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });

const fail = (res, message, statusCode = 400) =>
  res.status(statusCode).json({ success: false, message, timestamp: new Date().toISOString() });

// ============================================================
// GET /api/v1/books
// Returns all active books — number of books in DB = number of
// cards shown on the frontend.
// ============================================================
async function getAllBooks(req, res, next) {
  try {
    // Optional query filters
    const { category, search, limit = 100, offset = 0 } = req.query;

    let text = `SELECT ${SELECT_FIELDS} FROM books WHERE is_active = TRUE`;
    const params = [];

    if (category) {
      params.push(category.toLowerCase());
      text += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      text += ` AND (LOWER(name) LIKE LOWER($${params.length}) OR LOWER(author) LIKE LOWER($${params.length}))`;
    }

    params.push(parseInt(limit, 10));
    text += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    params.push(parseInt(offset, 10));
    text += ` OFFSET $${params.length}`;

    const result = await db.query(text, params);

    // Count for pagination metadata
    let countText = `SELECT COUNT(*) FROM books WHERE is_active = TRUE`;
    const countParams = [];
    if (category) { countParams.push(category.toLowerCase()); countText += ` AND category = $1`; }

    const countResult = await db.query(countText, countParams);
    const totalCount  = parseInt(countResult.rows[0].count, 10);

    logger.info('getAllBooks', {
      count:    result.rowCount,
      total:    totalCount,
      userId:   req.user?.userId,
    });

    return ok(res, {
      books:       result.rows,
      total:       totalCount,
      returned:    result.rowCount,
      limit:       parseInt(limit, 10),
      offset:      parseInt(offset, 10),
    }, `${result.rowCount} books retrieved`);

  } catch (err) {
    next(err);
  }
}

// ============================================================
// GET /api/v1/books/:id
// Returns a single book by ID.
// ============================================================
async function getBookById(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(id) || id <= 0) {
      return fail(res, 'Invalid book ID', 400);
    }

    const result = await db.query(
      `SELECT ${SELECT_FIELDS} FROM books WHERE id = $1 AND is_active = TRUE`,
      [id]
    );

    if (result.rowCount === 0) {
      return fail(res, `Book with ID ${id} not found`, 404);
    }

    return ok(res, result.rows[0], 'Book retrieved');

  } catch (err) {
    next(err);
  }
}

// ============================================================
// POST /api/v1/books
// Creates a new book (stores in booksdb.books table).
// Required body: name, author, cost
// Optional:      description, isbn, category, stock, image_url
// ============================================================
async function createBook(req, res, next) {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success:    false,
        message:    'Validation failed',
        errors:     handleValidationErrors(errors),
        timestamp:  new Date().toISOString(),
      });
    }

    const {
      name,
      author,
      cost,
      description  = null,
      isbn         = null,
      category     = 'general',
      stock        = 0,
      image_url    = null,
    } = req.body;

    const result = await db.query(
      `INSERT INTO books
         (name, author, cost, description, isbn, category, stock, image_url, is_active, schema_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 1)
       RETURNING ${SELECT_FIELDS}`,
      [name.trim(), author.trim(), parseFloat(cost), description, isbn, category.toLowerCase(), parseInt(stock, 10), image_url]
    );

    logger.info('createBook', { bookId: result.rows[0].id, name, userId: req.user?.userId });

    return ok(res, result.rows[0], 'Book created successfully', 201);

  } catch (err) {
    next(err);
  }
}

// ============================================================
// PUT /api/v1/books/:id
// Updates an existing book.
// ============================================================
async function updateBook(req, res, next) {
  try {
    const { id } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success:   false,
        message:   'Validation failed',
        errors:    handleValidationErrors(errors),
        timestamp: new Date().toISOString(),
      });
    }

    // Check book exists
    const existing = await db.query(
      'SELECT id FROM books WHERE id = $1 AND is_active = TRUE', [id]
    );
    if (existing.rowCount === 0) {
      return fail(res, `Book with ID ${id} not found`, 404);
    }

    const {
      name, author, cost, description, isbn,
      category, stock, image_url,
    } = req.body;

    const result = await db.query(
      `UPDATE books
       SET name        = COALESCE($1, name),
           author      = COALESCE($2, author),
           cost        = COALESCE($3, cost),
           description = COALESCE($4, description),
           isbn        = COALESCE($5, isbn),
           category    = COALESCE($6, category),
           stock       = COALESCE($7, stock),
           image_url   = COALESCE($8, image_url),
           updated_at  = NOW()
       WHERE id = $9 AND is_active = TRUE
       RETURNING ${SELECT_FIELDS}`,
      [name, author, cost, description, isbn, category, stock, image_url, id]
    );

    logger.info('updateBook', { bookId: id, userId: req.user?.userId });
    return ok(res, result.rows[0], 'Book updated successfully');

  } catch (err) {
    next(err);
  }
}

// ============================================================
// DELETE /api/v1/books/:id
// Soft-deletes a book (sets is_active = FALSE).
// ============================================================
async function deleteBook(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE books SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND is_active = TRUE
       RETURNING id, name`,
      [id]
    );

    if (result.rowCount === 0) {
      return fail(res, `Book with ID ${id} not found`, 404);
    }

    logger.info('deleteBook', { bookId: id, name: result.rows[0].name, userId: req.user?.userId });
    return ok(res, { id: result.rows[0].id }, 'Book deleted successfully');

  } catch (err) {
    next(err);
  }
}

module.exports = { getAllBooks, getBookById, createBook, updateBook, deleteBook };
