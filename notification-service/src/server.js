// src/server.js — Emart Notification Service
// Receives webhook events from Payment Service → sends order emails
// Port :8088  ·  Nginx /notify-api/
'use strict';
require('./config/env');   // validate JWT_SECRET + warn if SMTP not configured
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const { logger }    = require('./config/logger');
const notifyRoutes  = require('./routes/notifyRoutes');
const healthRoutes  = require('./routes/healthRoutes');
const { svcAuth }   = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 8088;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '512kb' }));
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

app.use('/health',       healthRoutes);
app.use('/api/v1/notify', svcAuth, notifyRoutes);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => logger.info(`Notification Service listening on :${PORT}`));
module.exports = app;
