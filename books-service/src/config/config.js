// ============================================================
// src/config/config.js
// Centralised env-var configuration for Books Service.
// All other modules import from here — never from process.env directly.
// ============================================================
'use strict';

require('dotenv').config();

const config = {
  app: {
    name:    process.env.APP_NAME    || 'emart-books-service',
    version: process.env.APP_VERSION || '1.0.0',
    env:     process.env.NODE_ENV    || 'development',
    port:    parseInt(process.env.PORT || '8082', 10),
  },
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME     || 'booksdb',
    user:     process.env.DB_USER     || 'emart_books',
    password: process.env.DB_PASSWORD || '',
    // Connection pool
    pool: {
      min:  parseInt(process.env.DB_POOL_MIN  || '2',  10),
      max:  parseInt(process.env.DB_POOL_MAX  || '10', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    },
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    // Must match Login Service JWT_SECRET — tokens issued by Login, validated here
    secret:     process.env.JWT_SECRET || '',
    algorithm:  'HS256',
  },
  log: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
    file:  process.env.LOG_FILE  || null,
  },
};

// Fail fast in production if critical vars are missing
if (config.app.env === 'production') {
  const required = ['JWT_SECRET', 'DB_PASSWORD', 'DB_HOST'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

module.exports = config;
