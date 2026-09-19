import request from 'supertest';
import app from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';

describe('Health and System Routes', () => {
  let _testTicket = '';
  beforeAll(() => {
    const authService = AuthService.getInstance();
    const session = authService.login('wsapi-admin', 'admin123');
    if (session) _testTicket = session.ticket;
  });

  it('GET /health should return status healthy and uptime', async () => {
    const res = await request(app).get('/health').set('x-wsapi-ticket', _testTicket);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toContain('AMS Prototype');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('GET / should return root summary info', async () => {
    const res = await request(app).get('/').set('x-wsapi-ticket', _testTicket).set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Agency Management System (AMS) Prototype');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.documentation).toBeDefined();
  });
});
