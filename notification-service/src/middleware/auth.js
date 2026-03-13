// src/middleware/auth.js
'use strict';
const jwt = require('jsonwebtoken');

// Service-to-service auth — same JWT_SECRET, accepts any valid token
// (Payment Service calls this with the user's JWT it received)
function svcAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  // Also accept shared service secret for internal calls
  const secret = req.headers['x-service-secret'];
  if (secret && secret === process.env.SERVICE_SECRET) return next();
  if (!token) return res.status(401).json({ success: false, message: 'Bearer token or X-Service-Secret required' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { svcAuth };
