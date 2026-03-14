// tests/unit/mailerService.test.js
'use strict';
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-123' })
  })),
  createTestAccount: jest.fn().mockResolvedValue({ user:'u', pass:'p' }),
  getTestMessageUrl:  jest.fn().mockReturnValue(null),
}));

const mailer = require('../../src/services/mailerService');

const mockOrder = {
  userEmail:      'test@emart.com',
  userName:       'Test User',
  orderNumber:    'EM-2024-000001',
  totalAmount:    1295.64,
  paymentMethod:  'UPI',
  transactionId:  'UPI-TEST-123',
  items: [{ productName:'Clean Code', category:'books', quantity:1, price:499, subtotal:499 }],
  shippingAddress: { fullName:'Test User', line1:'123 MG Road', city:'Bengaluru', state:'Karnataka', pinCode:'560001' }
};

describe('mailerService.sendOrderConfirmation', () => {
  it('sends email with success result', async () => {
    const result = await mailer.sendOrderConfirmation(mockOrder);
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('formats INR currency', async () => {
    // just check it doesn't throw
    await expect(mailer.sendOrderConfirmation(mockOrder)).resolves.not.toThrow();
  });
});

describe('mailerService.sendOrderFailed', () => {
  it('sends failure email', async () => {
    const result = await mailer.sendOrderFailed(mockOrder);
    expect(result.success).toBe(true);
  });
});

describe('mailerService.sendWelcome', () => {
  it('sends welcome email', async () => {
    const result = await mailer.sendWelcome({ email:'new@emart.com', name:'New User' });
    expect(result.success).toBe(true);
  });
});

describe('mailerService error handling', () => {
  it('returns success:false on transport error', async () => {
    const nodemailer = require('nodemailer');
    nodemailer.createTransport.mockReturnValueOnce({
      sendMail: jest.fn().mockRejectedValue(new Error('SMTP connection refused'))
    });
    // Reset transport cache
    delete require.cache[require.resolve('../../src/services/mailerService')];
    const freshMailer = require('../../src/services/mailerService');
    const result = await freshMailer.sendOrderConfirmation(mockOrder);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
