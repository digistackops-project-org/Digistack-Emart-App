// src/middleware/errorHandler.js
'use strict';
const { logger } = require('../config/logger');
function errorHandler(err, req, res, _next) {
  logger.error('Notification service error', { path: req.path, error: err.message });
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
}
module.exports = { errorHandler };
