import request from 'supertest';
import app from '../src/app.js';
import formatAPayload from '../sample_payloads/format_a_payload.json';
import formatBPayload from '../sample_payloads/format_b_payload.json';
import formatCPayload from '../sample_payloads/format_c_payload.json';
import formatDPayload from '../sample_payloads/format_d_payload.json';

describe('Integration & Legacy Migration Routes (/api/v1/integration)', () => {
  it('POST /api/v1/integration/import should process Format A payload', async () => {
    const res = await request(app)
      .post('/api/v1/integration/import')
      .send(formatAPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.summary.systemSource).toBe('FORMAT_A');
    expect(res.body.summary.successfullyTransformedCustomers).toBe(1);
    expect(res.body.summary.successfullyTransformedPolicies).toBe(2);
    expect(Array.isArray(res.body.result.logs)).toBe(true);
  });

  it('POST /api/v1/integration/import should process Format B payload', async () => {
    const res = await request(app)
      .post('/api/v1/integration/import')
      .send(formatBPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.summary.systemSource).toBe('FORMAT_B');
    expect(res.body.summary.successfullyTransformedCustomers).toBe(1);
    expect(res.body.summary.successfullyTransformedPolicies).toBe(1);
  });

  it('POST /api/v1/integration/import should process Format C payload', async () => {
    const res = await request(app)
      .post('/api/v1/integration/import')
      .send(formatCPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.summary.systemSource).toBe('FORMAT_C');
    expect(res.body.summary.successfullyTransformedCustomers).toBe(1);
    expect(res.body.summary.successfullyTransformedPolicies).toBe(1);
  });

  it('POST /api/v1/integration/import should process Format D payload', async () => {
    const res = await request(app)
      .post('/api/v1/integration/import')
      .send(formatDPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.summary.systemSource).toBe('FORMAT_D');
    expect(res.body.summary.successfullyTransformedCustomers).toBe(1);
    expect(res.body.summary.successfullyTransformedPolicies).toBe(2);
  });

  it('POST /api/v1/integration/dry-run should perform dry-run analysis without storing records', async () => {
    const res = await request(app)
      .post('/api/v1/integration/dry-run')
      .send(formatDPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.summary.dryRun).toBe(true);
    expect(res.body.result.customers[0].customerId).toBe('CUST-FMT-D-acc-cloud-99182');
  });

  it('GET /api/v1/integration/crosswalk-matrix should return field transformation rules', async () => {
    const res = await request(app).get('/api/v1/integration/crosswalk-matrix');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.matrix)).toBe(true);
    expect(res.body.matrix.length).toBeGreaterThanOrEqual(6);
  });

  it('POST /api/v1/integration/import should return 400 when payload is missing data', async () => {
    const res = await request(app)
      .post('/api/v1/integration/import')
      .send({ systemSource: 'FORMAT_A' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toContain('Missing "data" field');
  });

  it('GET /api/v1/carriers should return pre-seeded carrier list', async () => {
    const res = await request(app).get('/api/v1/carriers');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
  });
});
