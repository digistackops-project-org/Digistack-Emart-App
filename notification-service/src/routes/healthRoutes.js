// src/routes/healthRoutes.js
'use strict';
const router = require('express').Router();
router.get('/',      (_req, res) => res.json({ status:'UP', service:'emart-notification-service', version:'1.0.0', timestamp: new Date().toISOString() }));
router.get('/live',  (_req, res) => res.json({ status:'UP', probe:'liveness',  timestamp: new Date().toISOString() }));
router.get('/ready', (_req, res) => res.json({ status:'UP', probe:'readiness', timestamp: new Date().toISOString() }));
module.exports = router;
