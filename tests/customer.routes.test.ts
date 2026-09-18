import request from 'supertest';
import app from '../src/app.js';

describe('Customer Routes (/api/v1/customers)', () => {
  it('GET /api/v1/customers should return all seed customers', async () => {
    const res = await request(app).get('/api/v1/customers');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/v1/customers?name=Apex should filter customers by name', async () => {
    const res = await request(app).get('/api/v1/customers?name=Apex');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].businessName).toContain('Apex');
  });

  it('GET /api/v1/customers?policyNumber=POL-CA-2026-001 should filter by policy number', async () => {
    const res = await request(app).get('/api/v1/customers?policyNumber=POL-CA-2026-001');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].customerId).toBe('CUST-1001');
  });

  it('GET /api/v1/customers/:id should return single customer when ID exists', async () => {
    const res = await request(app).get('/api/v1/customers/CUST-1001');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.customerId).toBe('CUST-1001');
  });

  it('GET /api/v1/customers/:id should return 404 for non-existent customer', async () => {
    const res = await request(app).get('/api/v1/customers/CUST-INVALID-999');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toContain('not found');
  });

  it('POST /api/v1/customers should register a new customer', async () => {
    const newCustomerPayload = {
      entityType: 'Commercial',
      businessName: 'Summit Transport Services LLC',
      dba: 'Summit Freight',
      feinOrSsn: '55-9018273',
      address: {
        street1: '400 Summit Way',
        city: 'Peoria',
        state: 'IL',
        postalCode: '61602',
        country: 'USA'
      },
      contactInfo: {
        email: 'info@summittransport.com',
        phone: '309-555-4000'
      }
    };

    const res = await request(app)
      .post('/api/v1/customers')
      .send(newCustomerPayload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.customerId).toBeDefined();
    expect(res.body.data.businessName).toBe('Summit Transport Services LLC');
  });

  it('POST /api/v1/customers should return 400 for invalid payload missing name', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .send({ feinOrSsn: '00-0000000' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });
});
