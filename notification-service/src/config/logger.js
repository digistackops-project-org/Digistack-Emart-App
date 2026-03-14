// src/config/logger.js
'use strict';
const { createLogger, format, transports } = require('winston');
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...m }) =>
      `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${Object.keys(m).length ? ' ' + JSON.stringify(m) : ''}`)
  ),
  transports: [new transports.Console()],
});
module.exports = { logger };
