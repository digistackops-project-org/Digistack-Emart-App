// ============================================================
// src/controllers/healthController.js
// Three health endpoints:
//   GET /health        — service alive (process up)
//   GET /health/live   — liveness probe (process not stuck)
//   GET /health/ready  — readiness probe (PostgreSQL reachable)
// ============================================================
'use strict';

const db     = require('../config/database');
const config = require('../config/config');
const logger = require('../utils/logger');

const META = {
  service: config.app.name,
  version: config.app.version,
};

// ── GET /health ───────────────────────────────────────────────
async function health(req, res) {
  return res.status(200).json({
    status:    'UP',
    message:   'Books service is running',
    ...META,
    timestamp: new Date().toISOString(),
  });
}

// ── GET /health/live ─────────────────────────────────────────
// Liveness — is the Node process alive?
// Returns 200 if process is alive, 503 if it should be restarted.
async function liveness(req, res) {
  return res.status(200).json({
    status:    'UP',
    probe:     'liveness',
    message:   'Application process is alive',
    ...META,
    timestamp: new Date().toISOString(),
  });
}

// ── GET /health/ready ─────────────────────────────────────────
// Readiness — is the service ready to accept traffic?
// Checks PostgreSQL connectivity. Returns 503 if DB is down.
async function readiness(req, res) {
  const checks = {};
  let allHealthy = true;

  try {
    await db.ping();
    checks.postgresql = 'UP';
  } catch (err) {
    logger.error('Health check: PostgreSQL DOWN', { error: err.message });
    checks.postgresql = `DOWN - ${err.message}`;
    allHealthy = false;
  }

  const statusCode = allHealthy ? 200 : 503;
  return res.status(statusCode).json({
    status:    allHealthy ? 'UP' : 'DOWN',
    probe:     'readiness',
    message:   allHealthy
      ? 'Application is ready to serve traffic'
      : 'Application is NOT ready — dependencies unavailable',
    checks,
    ...META,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { health, liveness, readiness };
