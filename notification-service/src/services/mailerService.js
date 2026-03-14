// src/services/mailerService.js
'use strict';
const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const path       = require('path');
const fs         = require('fs');
const { logger } = require('../config/logger');

// ── Transport — SMTP (e.g. Gmail, SendGrid, Mailgun) ─────────
// Set SMTP_* env vars to enable real email.
// Without them, Nodemailer's ethereal test account is used (dev only).
let transport;

async function getTransport() {
  if (transport) return transport;

  if (process.env.SMTP_HOST) {
    transport = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    logger.info(`SMTP transport: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  } else {
    // Dev: Ethereal test email (prints preview URL to log)
    const testAccount = await nodemailer.createTestAccount();
    transport = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.warn('SMTP_HOST not set — using Ethereal test email (dev only)');
  }
  return transport;
}

// ── Handlebars template loader ────────────────────────────────
const templateCache = {};
function loadTemplate(name) {
  if (templateCache[name]) return templateCache[name];
  const file = path.join(__dirname, '../templates', `${name}.html`);
  const src  = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : getFallbackTemplate(name);
  const tpl  = Handlebars.compile(src);
  templateCache[name] = tpl;
  return tpl;
}

// ── Send helpers ──────────────────────────────────────────────
async function sendMail({ to, subject, template, data }) {
  try {
    const t    = loadTemplate(template);
    const html = t(data);
    const xp   = await getTransport();
    const info = await xp.sendMail({
      from:    `"Emart" <${process.env.FROM_EMAIL || 'noreply@emart.com'}>`,
      to, subject, html,
    });
    logger.info('Email sent', { to, subject, messageId: info.messageId });
    if (nodemailer.getTestMessageUrl(info)) {
      logger.info('Preview URL:', { url: nodemailer.getTestMessageUrl(info) });
    }
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error('Email send failed', { to, subject, error: err.message });
    return { success: false, error: err.message };
  }
}

async function sendOrderConfirmation(order) {
  const formatINR = (n) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(n || 0);

  return sendMail({
    to:       order.userEmail,
    subject:  `✅ Order Confirmed — ${order.orderNumber}`,
    template: 'order-confirmation',
    data: {
      userName:    order.userName || 'Valued Customer',
      orderNumber: order.orderNumber,
      totalAmount: formatINR(order.totalAmount),
      items:       (order.items || []).map(i => ({
        ...i, subtotal: formatINR(i.subtotal || i.price * i.quantity)
      })),
      shippingAddress: order.shippingAddress,
      paymentMethod:   order.paymentMethod?.replace('_', ' '),
      transactionId:   order.transactionId,
      year:            new Date().getFullYear(),
    }
  });
}

async function sendOrderFailed(order) {
  return sendMail({
    to:       order.userEmail,
    subject:  `❌ Payment Failed — ${order.orderNumber}`,
    template: 'order-failed',
    data: { userName: order.userName || 'Valued Customer', orderNumber: order.orderNumber, year: new Date().getFullYear() }
  });
}

async function sendWelcome(user) {
  return sendMail({
    to:       user.email,
    subject:  '👋 Welcome to Emart!',
    template: 'welcome',
    data: { name: user.name || 'there', year: new Date().getFullYear() }
  });
}

// ── Inline fallback templates (used if template files missing) ─
function getFallbackTemplate(name) {
  const base = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">`;
  const foot = `<p style="color:#9CA3AF;font-size:12px;margin-top:40px">© {{year}} Emart. All rights reserved.</p></body></html>`;

  switch (name) {
    case 'order-confirmation':
      return base + `
        <h1 style="color:#1D4ED8">✅ Order Confirmed!</h1>
        <p>Hi {{userName}}, your order <strong>{{orderNumber}}</strong> has been confirmed.</p>
        <h2 style="color:#374151">Items Ordered</h2>
        {{#each items}}
        <div style="border:1px solid #E5E7EB;padding:12px;border-radius:8px;margin-bottom:8px">
          <strong>{{productName}}</strong> × {{quantity}} — {{subtotal}}
        </div>
        {{/each}}
        <h3>Total: <span style="color:#1D4ED8">{{totalAmount}}</span></h3>
        <p>Payment: {{paymentMethod}} · Transaction: <code>{{transactionId}}</code></p>
        <a href="https://emart.com/orders" style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">View Order</a>
      ` + foot;
    case 'order-failed':
      return base + `
        <h1 style="color:#EF4444">❌ Payment Failed</h1>
        <p>Hi {{userName}}, payment for order <strong>{{orderNumber}}</strong> could not be processed.</p>
        <p>Your order is saved. Please retry from My Orders.</p>
        <a href="https://emart.com/orders" style="background:#EF4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Retry Payment</a>
      ` + foot;
    case 'welcome':
      return base + `
        <h1 style="color:#1D4ED8">👋 Welcome to Emart, {{name}}!</h1>
        <p>Discover Books, Courses, and Software — all in one place.</p>
        <a href="https://emart.com" style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Start Shopping</a>
      ` + foot;
    default:
      return base + `<p>Notification from Emart</p>` + foot;
  }
}

module.exports = { sendOrderConfirmation, sendOrderFailed, sendWelcome, sendMail };
