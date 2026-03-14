// ============================================================
// src/middleware/auth.js
// JWT authentication middleware.
// Validates tokens ISSUED by Login Service (same JWT_SECRET).
// Books Service does NOT issue tokens — only validates them.
// ============================================================
'use strict';

const jwt    = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Extracts and verifies Bearer JWT from Authorization header.
 * On success, attaches decoded payload to req.user:
 *   { userId, email, name, roles, iat, exp }
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header missing or malformed. Expected: Bearer <token>',
      timestamp: new Date().toISOString(),
    });
  }

  const token = authHeader.slice(7);

  if (!config.jwt.secret) {
    logger.error('JWT_SECRET is not configured');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
    });

    // Attach user info to request (set by Login Service when token was created)
    req.user = {
      userId: decoded.userId,
      email:  decoded.sub,      // Login Service sets subject = email
      name:   decoded.name,
      roles:  decoded.roles || [],
    };

    logger.debug('JWT verified', { userId: req.user.userId, email: req.user.email });
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success:   false,
        message:   'Token has expired. Please log in again.',
        timestamp: new Date().toISOString(),
      });
    }
    logger.warn('JWT verification failed', { error: err.message });
    return res.status(401).json({
      success:   false,
      message:   'Invalid token',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Role guard — use after authenticate().
 * Usage: router.get('/admin', authenticate, requireRole('ROLE_ADMIN'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const hasRole = roles.some(r => req.user.roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
