import request from 'supertest';
import app from '../src/app.js';
import { AccountingService } from '../src/services/accounting.service.js';

describe('Accounting & General Ledger Module (/api/v1/accounting)', () => {
  let accountingService: AccountingService;

  beforeEach(() => {
    accountingService = AccountingService.getInstance();
  });

  it('GET /api/v1/accounting/accounts should return Chart of Accounts', async () => {
    const res = await request(app).get('/api/v1/accounting/accounts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(8);
  });

  it('GET /api/v1/accounting/journal-entries should return journal entries list', async () => {
    const res = await request(app).get('/api/v1/accounting/journal-entries');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/accounting/journal-entries should post balanced double-entry transaction', async () => {
    const payload = {
      reference: 'MANUAL-JE-001',
      memo: 'Transfer from Operating Cash to Reserve',
      lines: [
        { accountNumber: '1000', description: 'Credit Operating Cash', debit: 0, credit: 5000 },
        { accountNumber: '1010', description: 'Debit Fiduciary Trust Cash', debit: 5000, credit: 0 }
      ]
    };

    const res = await request(app)
      .post('/api/v1/accounting/journal-entries')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.entryId).toBeDefined();
  });

  it('POST /api/v1/accounting/journal-entries should reject unbalanced entry (Debit != Credit)', async () => {
    const payload = {
      reference: 'UNBALANCED-001',
      memo: 'Invalid transaction',
      lines: [
        { accountNumber: '1000', description: 'Credit Operating Cash', debit: 0, credit: 5000 },
        { accountNumber: '1010', description: 'Debit Fiduciary Trust Cash', debit: 1000, credit: 0 }
      ]
    };

    const res = await request(app)
      .post('/api/v1/accounting/journal-entries')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Unbalanced Journal Entry');
  });

  it('GET /api/v1/accounting/invoices should return list of invoices', async () => {
    const res = await request(app).get('/api/v1/accounting/invoices');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/accounting/invoices/generate should create invoice for valid policy', async () => {
    const res = await request(app)
      .post('/api/v1/accounting/invoices/generate')
      .send({ policyId: 'POL-CA-2026-001', commissionRate: 15 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceId).toBeDefined();
    expect(res.body.data.agencyCommissionAmount).toBe(7275); // 15% of $48,500
    expect(res.body.data.netCarrierPayable).toBe(41225); // 85% of $48,500
  });

  it('POST /api/v1/accounting/payments should process payment receipt to Trust Account', async () => {
    // First generate an invoice
    const invRes = await request(app)
      .post('/api/v1/accounting/invoices/generate')
      .send({ policyId: 'POL-GL-2026-002', commissionRate: 12 });

    const invoiceId = invRes.body.data.invoiceId;

    // Post payment against invoice
    const payRes = await request(app)
      .post('/api/v1/accounting/payments')
      .send({
        invoiceId,
        amount: 5000,
        paymentMethod: 'ACH',
        referenceNumber: 'ACH-998120',
        depositAccount: '1010'
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.paymentId).toBeDefined();
    expect(payRes.body.data.depositedToAccount).toBe('1010');
  });

  it('GET /api/v1/accounting/financial-summary should return balanced trial balance and metrics', async () => {
    const res = await request(app).get('/api/v1/accounting/financial-summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isBalanced).toBe(true);
    expect(res.body.data.metrics.totalAccountsReceivable).toBeDefined();
    expect(res.body.data.metrics.trustCashBalance).toBeDefined();
  });
});
