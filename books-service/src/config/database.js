// ============================================================
// src/config/database.js
// PostgreSQL connection pool using node-postgres (pg).
// Single pool instance shared across all requests.
// ============================================================
'use strict';

const { Pool } = require('pg');
const config   = require('./config');
const logger   = require('../utils/logger');

const pool = new Pool({
  host:     config.db.host,
  port:     config.db.port,
  database: config.db.database,
  user:     config.db.user,
  password: config.db.password,
  min:      config.db.pool.min,
  max:      config.db.pool.max,
  idleTimeoutMillis: config.db.pool.idle,
  ssl:      config.db.ssl ? { rejectUnauthorized: false } : false,
  // Connection attempt config
  connectionTimeoutMillis: 10000,
});

// Log pool errors (prevents process crash on idle client error)
pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected to pool');
});

/**
 * Execute a parameterised query.
 * @param {string} text   SQL query with $1, $2 placeholders
 * @param {Array}  params Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('DB query', { text: text.substring(0, 80), duration, rows: result.rowCount });
    return result;
  } catch (err) {
    logger.error('DB query error', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
}

/**
 * Test connectivity — used by /health/ready endpoint.
 * @returns {Promise<boolean>}
 */
async function ping() {
  const result = await pool.query('SELECT 1 AS alive');
  return result.rows[0].alive === 1;
}

/**
 * Graceful shutdown — drains pool.
 */
async function close() {
  await pool.end();
  logger.info('PostgreSQL pool closed');
}

module.exports = { query, ping, close, pool };
