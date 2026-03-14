// ============================================================
// src/utils/logger.js
// Structured logger using Winston.
// ============================================================
'use strict';

const winston = require('winston');
const config  = require('../config/config');

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}] ${message}${metaStr}`;
      })
    ),
  }),
];

if (config.log.file) {
  transports.push(
    new winston.transports.File({
      filename: config.log.file,
      format:   winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

const logger = winston.createLogger({
  level:      config.log.level,
  transports,
  // Don't crash on uncaught errors
  exitOnError: false,
});

module.exports = logger;
