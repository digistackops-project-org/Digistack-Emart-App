// tests/unit/profileController.test.js
'use strict';
const { pool }   = require('../../src/config/database');
const { getProfile, updateProfile, getAddresses, addAddress, deleteAddress } =
      require('../../src/controllers/profileController');

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn() }
}));

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({
  userId:    'user-123',
  userEmail: 'test@emart.com',
  userName:  'Test User',
  body:      {},
  params:    {},
  ...overrides
});

describe('profileController.getProfile', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns existing profile', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id:'user-123', email:'test@emart.com', name:'Test' }] });
    const req = mockReq(); const res = mockRes();
    await getProfile(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('auto-creates profile if missing', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })   // no existing profile
      .mockResolvedValueOnce({ rows: [{ id:'user-123', email:'test@emart.com', name:'Test User' }] }); // insert
    const req = mockReq(); const res = mockRes();
    await getProfile(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Profile created' }));
  });
});

describe('profileController.updateProfile', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects invalid phone number', async () => {
    const req = mockReq({ body: { phone: '12345' } }); const res = mockRes();
    await updateProfile(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updates valid fields', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })   // ensure profile exists
      .mockResolvedValueOnce({ rows: [{ id:'user-123', bio:'New bio' }] }); // update
    const req = mockReq({ body: { bio: 'New bio' } }); const res = mockRes();
    await updateProfile(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('rejects empty update body', async () => {
    const req = mockReq({ body: {} }); const res = mockRes();
    await updateProfile(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('profileController.getAddresses', () => {
  it('returns list of addresses', async () => {
    const addresses = [{ id:1, line1:'123 MG Road', city:'Bengaluru' }];
    pool.query.mockResolvedValueOnce({ rows: addresses });
    const req = mockReq(); const res = mockRes();
    await getAddresses(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: addresses }));
  });
});

describe('profileController.addAddress', () => {
  it('rejects invalid PIN code', async () => {
    const req = mockReq({ body: { line1:'123 St', city:'Bengaluru', state:'Karnataka', pin_code:'0000' } });
    const res = mockRes();
    await addAddress(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects missing required fields', async () => {
    const req = mockReq({ body: { line1:'123 St' } });  // missing city, state, pin_code
    const res = mockRes();
    await addAddress(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('adds valid address', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })   // ensure profile
      .mockResolvedValueOnce({ rows: [{ id:1, line1:'123 MG Road' }] }); // insert
    const req = mockReq({ body: { line1:'123 MG Road', city:'Bengaluru', state:'Karnataka', pin_code:'560001' } });
    const res = mockRes();
    await addAddress(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('profileController.deleteAddress', () => {
  it('returns 404 if address not found', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const req = mockReq({ params: { id: '999' } }); const res = mockRes();
    await deleteAddress(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deletes successfully', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const req = mockReq({ params: { id: '1' } }); const res = mockRes();
    await deleteAddress(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
