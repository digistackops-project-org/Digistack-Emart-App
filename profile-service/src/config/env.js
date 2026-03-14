// src/config/env.js
'use strict';
// No dotenv in prod — env vars come from /etc/emart/profile.env via systemd EnvironmentFile
const required = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Required env var missing: ${key}`);
}
