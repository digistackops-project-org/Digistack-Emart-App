// src/server.js — Emart Profile Service (Node.js + Express)
// Port :8086  ·  Nginx prefix /profile-api/
'use strict';
require('./config/env');
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { logger } = require('./config/logger');
const { pool }   = require('./config/database');
const runMigrations = require('./db/migrate');

const profileRoutes = require('./routes/profileRoutes');
const healthRoutes  = require('./routes/healthRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 8086;

// ── Security / middleware ─────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true }));

// ── Routes ───────────────────────────────────────────────────
app.use('/health',        healthRoutes);
app.use('/api/v1/profile', authMiddleware, profileRoutes);

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Boot ─────────────────────────────────────────────────────
async function start() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection OK');
    await runMigrations();
    app.listen(PORT, '0.0.0.0', () =>
      logger.info(`Profile Service listening on :${PORT}`));
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

start();
module.exports = app;
