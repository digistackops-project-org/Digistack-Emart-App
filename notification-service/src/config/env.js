// src/config/env.js — Emart Notification Service
// Validates required env vars at startup so misconfiguration fails fast.
// In production, vars come from /etc/emart/notification.env via systemd EnvironmentFile.
'use strict';

const required = ['JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[FATAL] Required env var missing: ${key}`);
    console.error('       Set it in /etc/emart/notification.env and restart the service.');
    process.exit(1);
  }
}

// SMTP is optional — if absent, Ethereal test email is used (dev only)
if (!process.env.SMTP_HOST) {
  console.warn('[WARN]  SMTP_HOST not set — using Ethereal test email (dev mode).');
  console.warn('        Emails will NOT be delivered. Set SMTP_HOST in notification.env for production.');
}
