import { IAccountingRepository } from './repository.interfaces.js';
import { GlAccount, JournalEntry, Invoice, Payment, FinancialSummary } from '../types/domain.js';
import { withTenantTransaction } from './pg.pool.js';
import { randomUUID } from 'crypto';

export class PgAccountingRepository implements IAccountingRepository {
  async getAccounts(tenantId: string): Promise<GlAccount[]> {
    // Return empty array for now since no table defined for it yet
    return Promise.resolve([]);
  }

  async getAccountByNumber(tenantId: string, accountNumber: string): Promise<GlAccount | null> {
    return Promise.resolve(null);
  }

  async getAccountsByNumbers(tenantId: string, accountNumbers: string[]): Promise<GlAccount[]> {
    return Promise.resolve([]);
  }

  async getJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM journal_entries WHERE tenant_id = $1', [tenantId]);
      // ⚡ Bolt: Replaced O(N) Array.map() with a pre-allocated native loop to prevent inline closure allocations and improve hot-path performance
      const entries = new Array(res.rows.length);
      for (let i = 0; i < res.rows.length; i++) {
        const row = res.rows[i];
        entries[i] = {
          entryId: row.entry_id,
          entryDate: row.posted_at,
          reference: row.reference_id,
          memo: row.description,
          lines: row.lines || [], // requires JSONB column `lines`
          createdAt: row.posted_at
        };
      }
      return entries;
    });
  }

  async createJournalEntry(tenantId: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    return withTenantTransaction(tenantId, async (client) => {
      const id = entry.entryId || randomUUID();
      // ⚡ Bolt: Removed ALTER TABLE DDL execution on every transaction insert to eliminate severe database bottleneck
      const lines = entry.lines || [];
      const linesJson = JSON.stringify(lines);

      // ⚡ Bolt: Consolidated multiple array reduces into a single loop to prevent redundant O(N) array iterations
      let totalDebit = 0;
      let totalCredit = 0;
      for (const l of lines) {
        totalDebit += l.debit || 0;
        totalCredit += l.credit || 0;
      }
      
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

  async getInvoiceCount(tenantId: string): Promise<number> {
    return withTenantTransaction(tenantId, async (client) => {
      // ⚡ Bolt: Provide a direct count query to prevent loading all rows into memory at the service layer
      const res = await client.query('SELECT COUNT(*) as count FROM invoices WHERE tenant_id = $1', [tenantId]);
      return parseInt(res.rows[0]?.count || '0', 10);
    }).catch(err => {
      // Invoices table doesn't exist in schema yet, fallback gracefully
      return 0;
    });
  }

  async getInvoiceById(tenantId: string, invoiceId: string): Promise<Invoice | null> {
    return Promise.resolve(null);
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
