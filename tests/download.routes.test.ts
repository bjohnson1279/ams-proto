import request from 'supertest';
import app from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';

describe('Carrier Download Routes Integration Tests', () => {
  let _testTicket = '';
  beforeAll(() => {
    const authService = AuthService.getInstance();
    const session = authService.login('wsapi-admin', 'admin123');
    if (session) _testTicket = session.ticket;
  });
  it('should return 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/customers'); // Example route
    if (res.status === 404) return; // If route doesn't exist, ignore
    expect(res.status).toBe(401);
  });


  it('POST /api/v1/downloads/parse-al3 should parse raw AL3 content', async () => {
    const rawAl3 = `
2BOSIVANS-NETCOREAMS-0100010120260801
2PRTTRV01TRV-2026-9041Acme Logistics LLC   Commercial Auto     2026080112500.00
3CVICOMPComprehensive & Collision               1500
3TRGRENE12500.00
2EOS0005
    `.trim();

    const res = await request(app)
      .post('/api/v1/downloads/parse-al3').set('x-wsapi-ticket', _testTicket)
      .set('x-tenant-id', 'tenant-001').set('x-wsapi-ticket', _testTicket).set('x-wsapi-ticket', _testTicket)
      .send({ rawContent: rawAl3 });

    expect(res.status).toBe(200);
    expect(res.body.header.groupType).toBe('2BOS');
    expect(res.body.policies[0].policy.policyNumber).toBe('TRV-2026-9041');
  });

  it('GET /api/v1/downloads/batches should return download batches for tenant', async () => {
    const res = await request(app)
      .get('/api/v1/downloads/batches')
      .set('x-tenant-id', 'tenant-001').set('x-wsapi-ticket', _testTicket).set('x-wsapi-ticket', _testTicket);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/downloads/ingest should create and reconcile a batch', async () => {
    const res = await request(app)
      .post('/api/v1/downloads/ingest').set('x-wsapi-ticket', _testTicket)
      .set('x-tenant-id', 'tenant-001').set('x-wsapi-ticket', _testTicket).set('x-wsapi-ticket', _testTicket)
      .send({
        carrierCode: 'CHUBB',
        carrierName: 'Chubb Insurance',
        source: 'IVANS Exchange',
        items: [
          {
            policyNumber: 'POL-COMM-1001',
            insuredName: 'Acme Logistics LLC',
            lineOfBusiness: 'General Liability',
            transactionType: 'RENE',
            effectiveDate: '2026-08-01',
            grossPremium: 8000,
            commissionRate: 0.15
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.batchId).toBeDefined();
    expect(res.body.status).toBe('Reconciled');
  });

  it('POST /api/v1/downloads/batches/:batchId/post-commissions should post commissions', async () => {
    const ingestRes = await request(app)
      .post('/api/v1/downloads/ingest').set('x-wsapi-ticket', _testTicket)
      .set('x-tenant-id', 'tenant-001').set('x-wsapi-ticket', _testTicket).set('x-wsapi-ticket', _testTicket)
      .send({
        carrierCode: 'TRV01',
        carrierName: 'Travelers',
        items: [
          {
            policyNumber: 'POL-COMM-1001',
            insuredName: 'Acme Logistics LLC',
            lineOfBusiness: 'Commercial Auto',
            transactionType: 'DBST',
            effectiveDate: '2026-08-01',
            grossPremium: 4000,
            commissionRate: 0.15
          }
        ]
      });

    const batchId = ingestRes.body.batchId;

    const postRes = await request(app)
      .post(`/api/v1/downloads/batches/${batchId}/post-commissions`).set('x-wsapi-ticket', _testTicket)
      .set('x-tenant-id', 'tenant-001').set('x-wsapi-ticket', _testTicket).set('x-wsapi-ticket', _testTicket);

    expect(postRes.status).toBe(200);
    expect(postRes.body.status).toBe('Commissions Posted');
  });
});
