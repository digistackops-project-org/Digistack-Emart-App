'use strict';

const jwt    = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Express middleware that validates the JWT issued by the Login Service.
 * The token must be passed in the Authorization header as:
 *   Authorization: Bearer <token>
 *
 * On success, req.user is populated with the decoded payload.
 * On failure, responds immediately with 401.
 */
function authenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');

  if (!token || scheme.toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      message: 'Missing or malformed Authorization header',
    });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
    });
    req.user = payload;
    next();
  } catch (err) {
    logger.warn({ msg: 'JWT validation failed', error: err.message });
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: expired ? 'Token has expired' : 'Invalid token',
    });
  }
}

module.exports = { authenticate };
