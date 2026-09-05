import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';

describe('Policy Routes (/api/v1/policies)', () => {
  it('GET /api/v1/policies should return all active policies', async () => {
    const res = await request(app).get('/api/v1/policies');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/v1/policies?status=Active should filter by status', async () => {
    const res = await request(app).get('/api/v1/policies?status=Active');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    res.body.data.forEach((p: any) => {
      expect(p.status).toBe('Active');
    });
  });

  it('GET /api/v1/policies?carrierId=CARRIER-001 should filter by carrierId', async () => {
    const res = await request(app).get('/api/v1/policies?carrierId=CARRIER-001');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    res.body.data.forEach((p: any) => {
      expect(p.carrierId).toBe('CARRIER-001');
    });
  });

  it('GET /api/v1/policies?effectiveDate=2026-01-01 should filter by effective date', async () => {
    const res = await request(app).get('/api/v1/policies?effectiveDate=2026-01-01');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    res.body.data.forEach((p: any) => {
      expect(p.effectiveDate >= '2026-01-01').toBe(true);
    });
  });

  it('GET /api/v1/policies/:id should return single policy by policyId or policyNumber', async () => {
    const res = await request(app).get('/api/v1/policies/POL-CA-2026-001');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.policyId).toBe('POL-CA-2026-001');
  });

  it('GET /api/v1/policies/:id should return 404 for invalid policy ID', async () => {
    const res = await request(app).get('/api/v1/policies/POL-NON-EXISTENT');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });

  it('POST /api/v1/policies should create a new policy', async () => {
    const payload = {
      customerId: 'CUST-1001',
      carrierId: 'CARRIER-001',
      lineOfBusiness: 'Commercial Property',
      effectiveDate: '2026-06-01',
      expirationDate: '2027-06-01',
      status: 'Active',
      premiumAmount: 12500,
      billingType: 'Agency Bill'
    };

    const res = await request(app)
      .post('/api/v1/policies')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.policyId).toBeDefined();
    expect(res.body.data.lineOfBusiness).toBe('Commercial Property');
  });

  it('POST /api/v1/policies should return 400 for invalid payload missing customerId', async () => {
    const res = await request(app)
      .post('/api/v1/policies')
      .send({ lineOfBusiness: 'Commercial Auto' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('POST /api/v1/policies should call next(err) if amsService.createPolicy throws', async () => {
    const AmsService = (await import('../src/services/ams.service.js')).AmsService;
    const mockCreatePolicy = jest.spyOn(AmsService.prototype, 'createPolicy').mockImplementation(() => {
      throw new Error('Simulated creation failure');
    });

    const payload = {
      customerId: 'CUST-1001',
      lineOfBusiness: 'Commercial Property'
    };

    const res = await request(app)
      .post('/api/v1/policies')
      .send(payload);

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Simulated creation failure');

    mockCreatePolicy.mockRestore();
  });

  it('GET /api/v1/policies/:id/dec-page should return formatted ACORD Dec-Page payload', async () => {
    const res = await request(app).get('/api/v1/policies/POL-CA-2026-001/dec-page');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.documentTitle).toContain('ACORD');
    expect(res.body.data.insuredHeader.customerId).toBe('CUST-1001');
    expect(res.body.data.financials.totalPremium).toBeDefined();
    expect(Array.isArray(res.body.data.coverageDetails)).toBe(true);
    expect(Array.isArray(res.body.data.formsAndEndorsements)).toBe(true);
  });

  it('GET /api/v1/policies/:id/dec-page should return 404 for invalid policy ID', async () => {
    const res = await request(app).get('/api/v1/policies/POL-INVALID-999/dec-page');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });
});
