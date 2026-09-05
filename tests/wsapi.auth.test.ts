import request from 'supertest';
import app from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';

describe('WSAPI Auth & Operation Router (/api/v1/wsapi)', () => {
  let authService: AuthService;

  beforeAll(() => {
    authService = AuthService.getInstance();
  });

  afterEach(() => {
    // Clean up sessions between tests for isolation
    authService.clearSessions();
  });

  afterAll(() => {
    authService.stopPruner();
  });

  // ── Login Tests ─────────────────────────────────────────────────────

  describe('Login Operation', () => {
    it('POST /api/v1/wsapi/Login should return a ticket with valid dev credentials', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'wsapi-admin', password: 'admin123' },
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.operation).toBe('Login');
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket).toMatch(/^TKT-/);
      expect(res.body.responsePayload.loginId).toBe('wsapi-admin');
      expect(res.body.responsePayload.displayName).toBe('WSAPI Administrator');
      expect(res.body.responsePayload.expiresAt).toBeDefined();
    });

    it('POST /api/v1/wsapi/Login should reject invalid credentials with INVALID_CREDENTIALS fault', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'bad-user', password: 'wrong' },
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fault');
      expect(res.body.fault.code).toBe('INVALID_CREDENTIALS');
    });

    it('POST /api/v1/wsapi/Login should reject empty payload with VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({ operation: 'Login', requestPayload: {} });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fault');
      expect(res.body.fault.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/wsapi/Login should accept second dev user (wsapi-user-1)', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'wsapi-user-1', password: 'user123' },
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket).toBeDefined();
      expect(res.body.responsePayload.displayName).toBe('Sarah Jenkins (Producer)');
    });
  });

  // ── Ticket Validation Tests ─────────────────────────────────────────

  describe('Ticket Validation', () => {
    it('should reject requests without a ticket', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/CustomerGet')
        .send({ operation: 'CustomerGet', requestPayload: {} });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fault');
      expect(res.body.fault.code).toBe('INVALID_TICKET');
    });

    it('should reject requests with an invalid ticket', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/CustomerGet')
        .set('X-WSAPI-Ticket', 'TKT-fake-ticket-does-not-exist')
        .send({ operation: 'CustomerGet', requestPayload: {} });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fault');
      expect(res.body.fault.code).toBe('TICKET_EXPIRED');
    });

    it('should accept requests with a valid ticket in the header', async () => {
      // Login first
      const loginRes = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'wsapi-admin', password: 'admin123' },
        });

      const ticket = loginRes.body.ticket;

      // Use ticket for a subsequent operation
      const res = await request(app)
        .post('/api/v1/wsapi/CustomerGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({ operation: 'CustomerGet', requestPayload: {} });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.operation).toBe('CustomerGet');
    });
  });

  // ── Logout Tests ────────────────────────────────────────────────────

  describe('Logout Operation', () => {
    it('should invalidate a session ticket on logout', async () => {
      // Login
      const loginRes = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'wsapi-admin', password: 'admin123' },
        });

      const ticket = loginRes.body.ticket;

      // Logout
      const logoutRes = await request(app)
        .post('/api/v1/wsapi/Logout')
        .set('X-WSAPI-Ticket', ticket)
        .send({ operation: 'Logout' });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.status).toBe('success');

      // Attempt to use the old ticket — should fail
      const afterRes = await request(app)
        .post('/api/v1/wsapi/CustomerGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({ operation: 'CustomerGet', requestPayload: {} });

      expect(afterRes.status).toBe(401);
      expect(afterRes.body.fault.code).toBe('TICKET_EXPIRED');
    });
  });

  // ── ValidateAgentLogin Tests ────────────────────────────────────────

  describe('ValidateAgentLogin Operation', () => {
    it('should validate correct credentials without creating a persistent session', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/ValidateAgentLogin')
        .send({
          operation: 'ValidateAgentLogin',
          requestPayload: { loginId: 'wsapi-admin', password: 'admin123' },
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.responsePayload.valid).toBe(true);

      // Should not have created a persistent session
      expect(authService.getActiveSessionCount()).toBe(0);
    });

    it('should report invalid for bad credentials', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/ValidateAgentLogin')
        .send({
          operation: 'ValidateAgentLogin',
          requestPayload: { loginId: 'bad-user', password: 'wrong' },
        });

      expect(res.status).toBe(200);
      expect(res.body.responsePayload.valid).toBe(false);
    });
  });

  // ── CustomerGet via WSAPI ───────────────────────────────────────────

  describe('CustomerGet Operation', () => {
    let ticket: string;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'wsapi-admin', password: 'admin123' },
        });
      ticket = loginRes.body.ticket;
    });

    it('should return all customers when no filter specified', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/CustomerGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({ operation: 'CustomerGet', requestPayload: {} });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.responsePayload.customers).toBeDefined();
      expect(res.body.responsePayload.count).toBeGreaterThanOrEqual(3);
    });

    it('should return specific customer by customerId', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/CustomerGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'CustomerGet',
          requestPayload: { customerId: 'CUST-1001' },
        });

      expect(res.status).toBe(200);
      expect(res.body.responsePayload.customer).toBeDefined();
      expect(res.body.responsePayload.customer.customerId).toBe('CUST-1001');
    });

    it('should return 404 fault for non-existent customer', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/CustomerGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'CustomerGet',
          requestPayload: { customerId: 'CUST-NONEXIST' },
        });

      expect(res.status).toBe(404);
      expect(res.body.fault.code).toBe('ENTITY_NOT_FOUND');
    });

    it('should include policies when includePolicies is true', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/CustomerGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'CustomerGet',
          requestPayload: { customerId: 'CUST-1001', includePolicies: true },
        });

      expect(res.status).toBe(200);
      expect(res.body.responsePayload.policies).toBeDefined();
      expect(Array.isArray(res.body.responsePayload.policies)).toBe(true);
    });
  });

  // ── CustomerInsert via WSAPI ────────────────────────────────────────

  describe('CustomerInsert Operation', () => {
    let ticket: string;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'wsapi-admin', password: 'admin123' },
        });
      ticket = loginRes.body.ticket;
    });

    it('should create a new customer via WSAPI envelope', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/CustomerInsert')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'CustomerInsert',
          requestPayload: {
            entityType: 'Commercial',
            businessName: 'WSAPI Test Corp',
            feinOrSsn: '99-1234567',
            address: {
              street1: '500 WSAPI Blvd',
              city: 'Denver',
              state: 'CO',
              postalCode: '80202',
              country: 'USA',
            },
            contactInfo: {
              email: 'test@wsapicorp.com',
              phone: '303-555-1000',
            },
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.responsePayload.customer.businessName).toBe('WSAPI Test Corp');
      expect(res.body.responsePayload.customer.customerId).toBeDefined();
    });

    it('should reject CustomerInsert with missing name fields', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/CustomerInsert')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'CustomerInsert',
          requestPayload: { feinOrSsn: '00-0000000' },
        });

      expect(res.status).toBe(400);
      expect(res.body.fault.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── PolicyGet via WSAPI ─────────────────────────────────────────────

  describe('PolicyGet Operation', () => {
    let ticket: string;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'wsapi-admin', password: 'admin123' },
        });
      ticket = loginRes.body.ticket;
    });

    it('should return all policies when no filter specified', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/PolicyGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({ operation: 'PolicyGet', requestPayload: {} });

      expect(res.status).toBe(200);
      expect(res.body.responsePayload.policies).toBeDefined();
      expect(res.body.responsePayload.count).toBeGreaterThanOrEqual(1);
    });

    it('should return specific policy by policyId', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/PolicyGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'PolicyGet',
          requestPayload: { policyId: 'POL-CA-2026-001' },
        });

      expect(res.status).toBe(200);
      expect(res.body.responsePayload.policy).toBeDefined();
      expect(res.body.responsePayload.policy.policyId).toBe('POL-CA-2026-001');
    });

    it('should return 404 fault for non-existent policy', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/PolicyGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'PolicyGet',
          requestPayload: { policyId: 'POL-NONEXIST' },
        });

      expect(res.status).toBe(404);
      expect(res.body.fault.code).toBe('ENTITY_NOT_FOUND');
    });
  });

  // ── ValueListGet via WSAPI ──────────────────────────────────────────

  describe('ValueListGet Operation', () => {
    let ticket: string;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'wsapi-admin', password: 'admin123' },
        });
      ticket = loginRes.body.ticket;
    });

    it('should return PolicyStatus value list', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/ValueListGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'ValueListGet',
          requestPayload: { listName: 'PolicyStatus' },
        });

      expect(res.status).toBe(200);
      expect(res.body.responsePayload.listName).toBe('PolicyStatus');
      expect(res.body.responsePayload.values).toHaveLength(4);
      expect(res.body.responsePayload.values[0]).toHaveProperty('code');
      expect(res.body.responsePayload.values[0]).toHaveProperty('description');
    });

    it('should return TypeOfBusiness value list with all LOB codes', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/ValueListGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'ValueListGet',
          requestPayload: { listName: 'TypeOfBusiness' },
        });

      expect(res.status).toBe(200);
      expect(res.body.responsePayload.values.length).toBeGreaterThanOrEqual(7);
    });

    it('should return TransactionType value list', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/ValueListGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'ValueListGet',
          requestPayload: { listName: 'TransactionType' },
        });

      expect(res.status).toBe(200);
      expect(res.body.responsePayload.values.map((v: any) => v.code)).toEqual(
        expect.arrayContaining(['NewBusiness', 'Renewal', 'Endorsement', 'Cancellation'])
      );
    });

    it('should return 404 for unknown value list name', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/ValueListGet')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'ValueListGet',
          requestPayload: { listName: 'NonExistentList' },
        });

      expect(res.status).toBe(404);
      expect(res.body.fault.code).toBe('ENTITY_NOT_FOUND');
    });

    it('GET /api/v1/wsapi/valuelists/:name should also return value list (convenience)', async () => {
      const res = await request(app)
        .get('/api/v1/wsapi/valuelists/PersonnelRole');

      expect(res.status).toBe(200);
      expect(res.body.responsePayload.listName).toBe('PersonnelRole');
      expect(res.body.responsePayload.values.length).toBe(5);
    });
  });

  // ── Unsupported Operation Tests ─────────────────────────────────────

  describe('Unsupported Operations', () => {
    let ticket: string;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/v1/wsapi/Login')
        .send({
          operation: 'Login',
          requestPayload: { loginId: 'wsapi-admin', password: 'admin123' },
        });
      ticket = loginRes.body.ticket;
    });

    it('should return OPERATION_NOT_SUPPORTED for future phase operations', async () => {
      const res = await request(app)
        .post('/api/v1/wsapi/PolicyEndorse')
        .set('X-WSAPI-Ticket', ticket)
        .send({
          operation: 'PolicyEndorse',
          requestPayload: {},
        });

      expect(res.status).toBe(501);
      expect(res.body.fault.code).toBe('OPERATION_NOT_SUPPORTED');
    });
  });
});
