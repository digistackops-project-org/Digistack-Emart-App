// src/middleware/errorHandler.js
'use strict';
const { logger } = require('../config/logger');

function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error', { path: req.path, error: err.message });
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success:   false,
    message:   err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { errorHandler };
