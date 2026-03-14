// src/db/migrate.js
'use strict';
const { pool } = require('../config/database');
const { logger } = require('../config/logger');

const migrations = [
  {
    version: 1,
    name: 'create_user_profiles',
    sql: `
      CREATE TABLE IF NOT EXISTS user_profiles (
        id             VARCHAR(128) PRIMARY KEY,
        email          VARCHAR(255) NOT NULL UNIQUE,
        name           VARCHAR(255) NOT NULL,
        phone          VARCHAR(20),
        date_of_birth  DATE,
        gender         VARCHAR(20),
        avatar_url     VARCHAR(500),
        bio            TEXT,
        website        VARCHAR(500),
        company        VARCHAR(255),
        job_title      VARCHAR(255),
        newsletter     BOOLEAN      NOT NULL DEFAULT FALSE,
        notifications  BOOLEAN      NOT NULL DEFAULT TRUE,
        schema_version INTEGER      NOT NULL DEFAULT 1,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_addresses (
        id           BIGSERIAL    PRIMARY KEY,
        user_id      VARCHAR(128) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        label        VARCHAR(50)  NOT NULL DEFAULT 'home',
        full_name    VARCHAR(255),
        line1        VARCHAR(255) NOT NULL,
        line2        VARCHAR(255),
        city         VARCHAR(100) NOT NULL,
        state        VARCHAR(100) NOT NULL,
        pin_code     VARCHAR(10)  NOT NULL,
        country      VARCHAR(50)  NOT NULL DEFAULT 'India',
        phone        VARCHAR(20),
        is_default   BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INTEGER      PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_profile_email   ON user_profiles(email);
      CREATE INDEX IF NOT EXISTS idx_address_user_id ON user_addresses(user_id);
      CREATE INDEX IF NOT EXISTS idx_address_default ON user_addresses(user_id, is_default);
    `
  }
];

async function runMigrations() {
  for (const m of migrations) {
    const { rows } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1', [m.version]);
    if (rows.length > 0) {
      logger.info(`Migration v${m.version} already applied — skip`);
      continue;
    }
    logger.info(`Applying migration v${m.version}: ${m.name}`);
    await pool.query(m.sql);
    await pool.query(
      'INSERT INTO schema_migrations(version,name) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [m.version, m.name]);
    logger.info(`Migration v${m.version} applied`);
  }
}

module.exports = runMigrations;
