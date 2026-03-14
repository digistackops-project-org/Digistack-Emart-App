// src/middleware/auth.js
'use strict';
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Bearer token required' });
  try {
    const payload  = jwt.verify(token, process.env.JWT_SECRET);
    req.userId     = payload.userId || payload.sub;
    req.userEmail  = payload.email  || payload.sub;
    req.userName   = payload.name;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleware };
