// ============================================================
// src/server.js
// HTTP server entry point.
// Imports app.js, binds to port, handles graceful shutdown.
// ============================================================
'use strict';

const http   = require('http');
const app    = require('./app');
const config = require('./config/config');
const db     = require('./config/database');
const logger = require('./utils/logger');

const server = http.createServer(app);

// ── Start ──────────────────────────────────────────────────
server.listen(config.app.port, () => {
  logger.info(`Emart Books Service started`, {
    port:    config.app.port,
    env:     config.app.env,
    version: config.app.version,
    pid:     process.pid,
  });
  logger.info(`Health endpoints:`);
  logger.info(`  GET http://localhost:${config.app.port}/health`);
  logger.info(`  GET http://localhost:${config.app.port}/health/live`);
  logger.info(`  GET http://localhost:${config.app.port}/health/ready`);
  logger.info(`Books API:`);
  logger.info(`  GET  http://localhost:${config.app.port}/api/v1/books`);
  logger.info(`  POST http://localhost:${config.app.port}/api/v1/books`);
});

// ── Graceful shutdown ─────────────────────────────────────
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await db.close();
      logger.info('Books Service stopped cleanly');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // Force exit after 30s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Prevent crash on unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

module.exports = server; // export for testing
