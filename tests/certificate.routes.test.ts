import request from 'supertest';
import app from '../src/app.js';

describe('Certificate & Holder Routes (/api/v1/certificates & /api/v1/holders)', () => {
  it('GET /api/v1/certificates should list initial certificates', async () => {
    const res = await request(app).get('/api/v1/certificates');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/certificates/:id should return single certificate', async () => {
    const res = await request(app).get('/api/v1/certificates/CERT-2026-001');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.certificateId).toBe('CERT-2026-001');
  });

  it('GET /api/v1/certificates/:id/render should return 200 HTML content', async () => {
    const res = await request(app).get('/api/v1/certificates/CERT-2026-001/render');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('ACORD 25');
  });

  it('GET /api/v1/holders should return list of certificate holders', async () => {
    const res = await request(app).get('/api/v1/holders');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
  });

  it('POST /api/v1/holders should create a new certificate holder', async () => {
    const payload = {
      name: 'Tri-State Heavy Equipment Rentals',
      attention: 'Certificates Dept',
      address: {
        street1: '1200 Commercial Way',
        city: 'Rockford',
        state: 'IL',
        postalCode: '61101',
        country: 'USA'
      },
      email: 'risk@tristateequip.com'
    };

    const res = await request(app)
      .post('/api/v1/holders')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.holderId).toBeDefined();
    expect(res.body.data.name).toBe('Tri-State Heavy Equipment Rentals');
  });

  it('POST /api/v1/certificates should generate new certificate', async () => {
    const payload = {
      customerId: 'CUST-1001',
      holderId: 'HOLDER-1001',
      policyIds: ['POL-GL-2026-002'],
      descriptionOfOperations: 'Equipment Lease Agreement #2026-X'
    };

    const res = await request(app)
      .post('/api/v1/certificates')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.certificateId).toBeDefined();
    expect(res.body.data.descriptionOfOperations).toContain('Equipment Lease Agreement #2026-X');
  });

  it('POST /api/v1/certificates/bulk-issue should mass generate certificates', async () => {
    const payload = {
      customerId: 'CUST-1001',
      holderIds: ['HOLDER-1001', 'HOLDER-1002'],
      policyIds: ['ALL'],
      descriptionOfOperations: 'Batch Annual COI Renewal'
    };

    const res = await request(app)
      .post('/api/v1/certificates/bulk-issue')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.count).toBe(2);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
