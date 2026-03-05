// ============================================================
// src/routes/bookRoutes.js
// All /api/v1/books routes — authentication required.
// ============================================================
'use strict';

const express         = require('express');
const { body, param, query } = require('express-validator');
const { authenticate }       = require('../middleware/auth');
const bookController         = require('../controllers/bookController');

const router = express.Router();

// All book routes require a valid JWT from the Login Service
router.use(authenticate);

// ── Validation rules ──────────────────────────────────────────
const createBookValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Book name is required')
    .isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters'),

  body('author')
    .trim()
    .notEmpty().withMessage('Author name is required')
    .isLength({ min: 1, max: 255 }).withMessage('Author must be between 1 and 255 characters'),

  body('cost')
    .notEmpty().withMessage('Cost is required')
    .isFloat({ min: 0 }).withMessage('Cost must be a non-negative number'),

  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('isbn')
    .optional()
    .isLength({ max: 20 }).withMessage('ISBN cannot exceed 20 characters'),

  body('category')
    .optional()
    .isIn(['general', 'programming', 'science', 'mathematics', 'business', 'fiction', 'other'])
    .withMessage('Invalid category'),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),

  body('image_url')
    .optional()
    .isURL().withMessage('image_url must be a valid URL'),
];

const updateBookValidation = [
  param('id').isInt({ min: 1 }).withMessage('Book ID must be a positive integer'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters'),

  body('author')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('Author must be between 1 and 255 characters'),

  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost must be a non-negative number'),

  body('category')
    .optional()
    .isIn(['general', 'programming', 'science', 'mathematics', 'business', 'fiction', 'other'])
    .withMessage('Invalid category'),
];

// ── Routes ────────────────────────────────────────────────────

// GET /api/v1/books?category=&search=&limit=&offset=
router.get('/', bookController.getAllBooks);

// GET /api/v1/books/:id
router.get('/:id', param('id').isInt({ min: 1 }), bookController.getBookById);

// POST /api/v1/books
router.post('/', createBookValidation, bookController.createBook);

// PUT /api/v1/books/:id
router.put('/:id', updateBookValidation, bookController.updateBook);

// DELETE /api/v1/books/:id  (soft delete)
router.delete('/:id', param('id').isInt({ min: 1 }), bookController.deleteBook);

module.exports = router;
