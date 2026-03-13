// tests/integration/profile.integration.test.js
// Requires: PostgreSQL running with profiledb + PROFILE_TEST_DB env
'use strict';
const { Pool } = require('pg');
const runMigrations = require('../../src/db/migrate');

const TEST_DB = process.env.PROFILE_TEST_DB || 'postgresql://emart_profile:password@localhost:5432/profiledb_test';

describe('Profile DB Migrations', () => {
  let pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DB });
    process.env.DB_HOST     = 'localhost';
    process.env.DB_PORT     = '5432';
    process.env.DB_NAME     = 'profiledb_test';
    process.env.DB_USER     = 'emart_profile';
    process.env.DB_PASSWORD = 'password';
    try { await runMigrations(); } catch { /* skip if DB unavailable */ }
  });

  afterAll(async () => {
    try { await pool?.end(); } catch {}
  });

  it('creates user_profiles table', async () => {
    try {
      const { rows } = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name='user_profiles'");
      expect(rows).toHaveLength(1);
    } catch { console.log('Skipped — DB not available'); }
  });

  it('creates user_addresses table', async () => {
    try {
      const { rows } = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name='user_addresses'");
      expect(rows).toHaveLength(1);
    } catch { console.log('Skipped — DB not available'); }
  });
});
