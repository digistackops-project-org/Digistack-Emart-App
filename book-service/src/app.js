// ============================================================
// src/app.js
// Express application factory.
// Deliberately does NOT call app.listen() so tests can import
// cleanly without binding to a port.
// ============================================================
'use strict';

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');

const config       = require('./config/config');
const logger       = require('./utils/logger');
const bookRoutes   = require('./routes/bookRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ── Security headers ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS — allow all origins (Nginx controls external access) ─
app.use(cors({
  origin:  '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── HTTP request logging ──────────────────────────────────────
if (config.app.env !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Routes ────────────────────────────────────────────────────

// Health endpoints (no auth) — Nginx & K8s probes
app.use('/health', healthRoutes);

// Books API (JWT auth enforced in bookRoutes)
app.use('/api/v1/books', bookRoutes);

// ── 404 + global error handler ────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
