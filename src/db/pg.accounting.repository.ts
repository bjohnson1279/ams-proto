import { IAccountingRepository } from './repository.interfaces.js';
import { GlAccount, JournalEntry, Invoice, Payment, FinancialSummary } from '../types/domain.js';
import { withTenantTransaction } from './pg.pool.js';
import { randomUUID } from 'crypto';

export class PgAccountingRepository implements IAccountingRepository {
  async getAccounts(tenantId: string): Promise<GlAccount[]> {
    // Return empty array for now since no table defined for it yet
    return Promise.resolve([]);
  }

  async getJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM journal_entries WHERE tenant_id = $1', [tenantId]);
      return res.rows.map(row => ({
        entryId: row.entry_id,
        entryDate: row.posted_at,
        reference: row.reference_id,
        memo: row.description,
        lines: row.lines || [], // requires JSONB column `lines`
        createdAt: row.posted_at
      }));
    });
  }

  async createJournalEntry(tenantId: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    return withTenantTransaction(tenantId, async (client) => {
      const id = entry.entryId || randomUUID();
      await client.query(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS lines JSONB`);
      const linesJson = JSON.stringify(entry.lines || []);
      const totalDebit = (entry.lines || []).reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredit = (entry.lines || []).reduce((sum, l) => sum + (l.credit || 0), 0);
      
      const res = await client.query(
        `INSERT INTO journal_entries (entry_id, tenant_id, description, reference_id, source, total_debit, total_credit, lines)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [id, tenantId, entry.memo || '', entry.reference || '', 'Manual', totalDebit, totalCredit, linesJson]
      );
      
      const row = res.rows[0];
      return {
        entryId: row.entry_id,
        entryDate: row.posted_at,
        reference: row.reference_id,
        memo: row.description,
        lines: row.lines || [],
        createdAt: row.posted_at
      };
    });
  }

  async getInvoices(tenantId: string): Promise<Invoice[]> {
    return Promise.resolve([]);
  }

  async createInvoice(tenantId: string, invoice: Partial<Invoice>): Promise<Invoice> {
    return Promise.resolve(invoice as Invoice);
  }

  async getPayments(tenantId: string): Promise<Payment[]> {
    return Promise.resolve([]);
  }

  async createPayment(tenantId: string, payment: Partial<Payment>): Promise<Payment> {
    return Promise.resolve(payment as Payment);
  }

  async getFinancialSummary(tenantId: string): Promise<FinancialSummary> {
    return Promise.resolve({
      trialBalance: [],
      totalDebits: 0,
      totalCredits: 0,
      isBalanced: true,
      metrics: {
        totalAccountsReceivable: 0,
        totalCarrierPayables: 0,
        operatingCashBalance: 0,
        trustCashBalance: 0,
        ytdCommissionRevenue: 0
      }
    });
  }
}
