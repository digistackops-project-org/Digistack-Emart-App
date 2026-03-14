// src/config/logger.js
'use strict';
const { createLogger, format, transports } = require('winston');
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const m = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${m}`;
    })
  ),
  transports: [new transports.Console()],
});
module.exports = { logger };
