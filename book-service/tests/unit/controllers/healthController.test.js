'use strict';
/**
 * Unit tests — Health Controller
 */

jest.mock('../../src/config/database', () => ({
  checkConnection: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

const db               = require('../../src/config/database');
const healthController = require('../../src/controllers/healthController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

describe('HealthController — /health', () => {
  it('returns 200 with service info', () => {
    const req = {};
    const res = mockRes();
    healthController.health(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe('UP');
    expect(body.service).toBeDefined();
    expect(body.uptimeMs).toBeGreaterThanOrEqual(0);
  });
});

describe('HealthController — /health/live', () => {
  it('always returns 200 without DB check', () => {
    const res = mockRes();
    healthController.healthLive({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(db.checkConnection).not.toHaveBeenCalled();
  });
});

describe('HealthController — /health/ready', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 when DB is reachable', async () => {
    db.checkConnection.mockResolvedValue(true);
    const res = mockRes();
    await healthController.healthReady({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].status).toBe('UP');
    expect(res.json.mock.calls[0][0].checks.database).toBe(true);
  });

  it('returns 503 when DB is down', async () => {
    db.checkConnection.mockRejectedValue(new Error('Connection refused'));
    const res = mockRes();
    await healthController.healthReady({}, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].status).toBe('DOWN');
    expect(res.json.mock.calls[0][0].checks.database).toBe(false);
  });
});
