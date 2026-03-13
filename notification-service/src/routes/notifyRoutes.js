// src/routes/notifyRoutes.js
'use strict';
const router  = require('express').Router();
const mailer  = require('../services/mailerService');
const { logger } = require('../config/logger');

// POST /api/v1/notify/order-confirmed  — called by Payment Service after success
router.post('/order-confirmed', async (req, res, next) => {
  try {
    const order = req.body;
    if (!order?.userEmail || !order?.orderNumber)
      return res.status(400).json({ success: false, message: 'userEmail and orderNumber required' });

    logger.info('Sending order confirmation email', { orderNumber: order.orderNumber, to: order.userEmail });
    const result = await mailer.sendOrderConfirmation(order);
    res.json({ success: true, message: 'Order confirmation email sent', data: result });
  } catch (err) { next(err); }
});

// POST /api/v1/notify/order-failed
router.post('/order-failed', async (req, res, next) => {
  try {
    const order = req.body;
    if (!order?.userEmail || !order?.orderNumber)
      return res.status(400).json({ success: false, message: 'userEmail and orderNumber required' });

    logger.info('Sending payment-failed email', { orderNumber: order.orderNumber, to: order.userEmail });
    const result = await mailer.sendOrderFailed(order);
    res.json({ success: true, message: 'Payment failed email sent', data: result });
  } catch (err) { next(err); }
});

// POST /api/v1/notify/welcome
router.post('/welcome', async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'email required' });
    const result = await mailer.sendWelcome({ email, name });
    res.json({ success: true, message: 'Welcome email sent', data: result });
  } catch (err) { next(err); }
});

// POST /api/v1/notify/test  — dev/QA only
router.post('/test', async (req, res, next) => {
  try {
    const { to = 'test@emart.com', type = 'order-confirmed' } = req.body;
    const fakeOrder = {
      userEmail:  to, userName: 'Test User',
      orderNumber: 'EM-2024-999999', totalAmount: 1295.64,
      paymentMethod: 'UPI', transactionId: 'UPI-TEST-12345',
      items: [{ productName: 'Clean Code', quantity: 1, price: 499, subtotal: 499 }],
      shippingAddress: { fullName: 'Test User', line1: '123 MG Road', city: 'Bengaluru', state: 'Karnataka', pinCode: '560001' }
    };
    let result;
    if (type === 'order-confirmed') result = await mailer.sendOrderConfirmation(fakeOrder);
    else if (type === 'order-failed') result = await mailer.sendOrderFailed(fakeOrder);
    else if (type === 'welcome') result = await mailer.sendWelcome({ email: to, name: 'Test User' });
    else return res.status(400).json({ success: false, message: 'type must be order-confirmed|order-failed|welcome' });
    res.json({ success: true, message: `Test ${type} email sent`, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
