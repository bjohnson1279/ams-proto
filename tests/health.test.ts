import request from 'supertest';
import app from '../src/app.js';

describe('Health and System Routes', () => {
  it('GET /health should return status healthy and uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toContain('AMS Prototype');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('GET / should return root summary info', async () => {
    const res = await request(app).get('/').set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Agency Management System (AMS) Prototype');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.documentation).toBeDefined();
  });
});
