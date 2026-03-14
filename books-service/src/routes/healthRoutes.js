// ============================================================
// src/routes/healthRoutes.js
// Health endpoints — NO authentication required.
// These must be publicly accessible for load balancers,
// systemd watchdog, and K8s probes.
// ============================================================
'use strict';

const express         = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

// GET /health          — basic UP check
router.get('/',       healthController.health);

// GET /health/live     — liveness probe
router.get('/live',   healthController.liveness);

// GET /health/ready    — readiness probe (checks PostgreSQL)
router.get('/ready',  healthController.readiness);

module.exports = router;
