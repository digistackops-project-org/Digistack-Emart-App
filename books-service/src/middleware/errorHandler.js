// ============================================================
// src/middleware/errorHandler.js
// Global error handler — must be registered LAST in Express.
// ============================================================
'use strict';

const logger = require('../utils/logger');

/**
 * Validation error formatter for express-validator.
 */
function handleValidationErrors(errors) {
  return errors.array().reduce((acc, err) => {
    acc[err.path || err.param] = err.msg;
    return acc;
  }, {});
}

/**
 * Centralised error middleware.
 * Express calls this when next(err) is invoked.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  const path      = req.originalUrl;

  // PostgreSQL specific errors
  if (err.code) {
    if (err.code === '23505') {  // unique_violation
      return res.status(409).json({
        success:   false,
        message:   'A record with this value already exists.',
        field:     err.detail,
        timestamp,
        path,
      });
    }
    if (err.code === '23502') {  // not_null_violation
      return res.status(400).json({
        success:   false,
        message:   `Required field missing: ${err.column}`,
        timestamp,
        path,
      });
    }
    if (err.code === '23514') {  // check_violation
      return res.status(400).json({
        success:   false,
        message:   'Value violates database constraint.',
        timestamp,
        path,
      });
    }
  }

  // Application-defined errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success:   false,
      message:   err.message,
      timestamp,
      path,
    });
  }

  // Unexpected errors
  logger.error('Unhandled error', {
    message: err.message,
    stack:   err.stack,
    path,
    method:  req.method,
  });

  res.status(500).json({
    success:   false,
    message:   'An unexpected error occurred. Please try again.',
    timestamp,
    path,
  });
}

/**
 * 404 handler — register before errorHandler.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success:   false,
    message:   `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Creates an application error with HTTP status code.
 */
function createError(message, statusCode = 500) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, notFoundHandler, createError, handleValidationErrors };
