// src/routes/healthRoutes.js
'use strict';
const router = require('express').Router();
const { pool } = require('../config/database');

router.get('/', (_req, res) => res.json({
  status: 'UP', service: 'emart-profile-service', version: '1.0.0', timestamp: new Date().toISOString()
}));
router.get('/live', (_req, res) => res.json({
  status: 'UP', probe: 'liveness', timestamp: new Date().toISOString()
}));
router.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', checks: { postgresql: 'UP' }, timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'DOWN', checks: { postgresql: 'DOWN' }, timestamp: new Date().toISOString() });
  }
});

module.exports = router;
