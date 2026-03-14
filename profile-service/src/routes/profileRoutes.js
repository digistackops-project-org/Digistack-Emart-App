// src/routes/profileRoutes.js
'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/profileController');

router.get('/',               ctrl.getProfile);
router.put('/',               ctrl.updateProfile);
router.get('/addresses',      ctrl.getAddresses);
router.post('/addresses',     ctrl.addAddress);
router.put('/addresses/:id',  ctrl.updateAddress);
router.delete('/addresses/:id', ctrl.deleteAddress);

module.exports = router;
