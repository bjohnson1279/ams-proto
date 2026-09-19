import {
  ICustomerRepository, IPolicyRepository, ICarrierRepository,
  ICertificateHolderRepository, ICertificateRepository,
  IAccountingRepository, IDownloadRepository
} from './repository.interfaces.js';
import {
  Customer, Policy, Carrier, CertificateHolder, CertificateOfInsurance,
  GlAccount, JournalEntry, Invoice, Payment, FinancialSummary
} from '../types/domain.js';
import {
  INITIAL_CUSTOMERS, INITIAL_POLICIES, INITIAL_CARRIERS,
  INITIAL_CERTIFICATE_HOLDERS, INITIAL_CERTIFICATES,
  DEFAULT_CHART_OF_ACCOUNTS, INITIAL_JOURNAL_ENTRIES, INITIAL_DOWNLOAD_BATCHES
} from '../data/seedData.js';
import { randomUUID } from 'crypto';

export class MemoryCustomerRepository implements ICustomerRepository {
  private customers = [...INITIAL_CUSTOMERS];

  async getAll(tenantId: string, filter?: any): Promise<Customer[]> {
    if (!filter || !filter.name) {
      return Promise.resolve([...this.customers]);
    }
    const q = filter.name.toLowerCase();
    return Promise.resolve(this.customers.filter(c => {
      const fullIndName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const busName = (c.businessName || '').toLowerCase();
      const dba = (c.dba || '').toLowerCase();
      return fullIndName.includes(q) || busName.includes(q) || dba.includes(q);
    }));
  }

  async getById(tenantId: string, id: string): Promise<Customer | null> {
    const c = this.customers.find(c => c.customerId === id);
    return Promise.resolve(c || null);
  }

  async create(tenantId: string, payload: Partial<Customer>): Promise<Customer> {
    const customer = { ...payload, customerId: payload.customerId || randomUUID(), tenantId } as Customer;
    this.customers.push(customer);
    return Promise.resolve(customer);
  }
}

export class MemoryPolicyRepository implements IPolicyRepository {
  private policies = [...INITIAL_POLICIES];

  async getAll(tenantId: string, filter?: any): Promise<Policy[]> {
    if (!filter || (!filter.customerId && !filter.carrierId && !filter.status && !filter.effectiveDate)) {
      return Promise.resolve([...this.policies]);
    }
    const st = filter.status?.toLowerCase();
    const targetDate = filter.effectiveDate;
    return Promise.resolve(this.policies.filter(p => {
      if (filter.customerId && p.customerId !== filter.customerId) return false;
      if (filter.carrierId && p.carrierId !== filter.carrierId) return false;
      if (st && p.status.toLowerCase() !== st) return false;
      if (targetDate && p.effectiveDate < targetDate) return false;
      return true;
    }));
  }

  async getById(tenantId: string, id: string): Promise<Policy | null> {
    const p = this.policies.find(p => p.policyId === id);
    return Promise.resolve(p || null);
  }

  async create(tenantId: string, payload: Partial<Policy>): Promise<Policy> {
    const policy = { ...payload, policyId: payload.policyId || randomUUID(), tenantId } as Policy;
    this.policies.push(policy);
    return Promise.resolve(policy);
  }
}

export class MemoryCarrierRepository implements ICarrierRepository {
  private carriers = [...INITIAL_CARRIERS];

  async getAll(tenantId: string): Promise<Carrier[]> {
    return Promise.resolve(this.carriers);
  }

  async getById(tenantId: string, id: string): Promise<Carrier | null> {
    const c = this.carriers.find(c => c.carrierId === id);
    return Promise.resolve(c || null);
  }
}

export class MemoryCertificateHolderRepository implements ICertificateHolderRepository {
  private holders = [...INITIAL_CERTIFICATE_HOLDERS];

  async getAll(tenantId: string, filter?: any): Promise<CertificateHolder[]> {
    // ⚡ Bolt: Consolidated sequential .filter() array scans into a single loop to avoid allocating intermediate arrays
    const q = filter?.name ? filter.name.toLowerCase() : null;
    return Promise.resolve(this.holders.filter(h => {
      if (h.deactivatedAt) return false;
      if (q && !h.name.toLowerCase().includes(q)) return false;
      return true;
    }));
  }

  async getById(tenantId: string, id: string): Promise<CertificateHolder | null> {
    return Promise.resolve(this.holders.find(h => h.holderId === id) || null);
  }

  async create(tenantId: string, payload: Partial<CertificateHolder>): Promise<CertificateHolder> {
    const holder = { ...payload, holderId: payload.holderId || randomUUID(), tenantId } as CertificateHolder;
    this.holders.push(holder);
    return Promise.resolve(holder);
  }

  async update(tenantId: string, id: string, payload: Partial<CertificateHolder>): Promise<CertificateHolder> {
    const idx = this.holders.findIndex(h => h.holderId === id);
    if (idx >= 0) {
      this.holders[idx] = { ...this.holders[idx], ...payload, updatedAt: new Date().toISOString() };
      return Promise.resolve(this.holders[idx]);
    }
    throw new Error('Not found');
  }

  async deactivate(tenantId: string, id: string): Promise<void> {
    const holder = this.holders.find(h => h.holderId === id);
    if (holder) {
      holder.deactivatedAt = new Date().toISOString();
    }
    return Promise.resolve();
  }
}

export class MemoryCertificateRepository implements ICertificateRepository {
  private certs = [...INITIAL_CERTIFICATES];

  async getAll(tenantId: string, filter?: any): Promise<CertificateOfInsurance[]> {
    if (!filter || (!filter.customerId && !filter.status)) {
      return Promise.resolve([...this.certs]);
    }
    return Promise.resolve(this.certs.filter(c => {
      if (filter.customerId && c.insured?.customerId !== filter.customerId) return false;
      if (filter.status && c.status !== filter.status) return false;
      return true;
    }));
  }

  async getById(tenantId: string, id: string): Promise<CertificateOfInsurance | null> {
    return Promise.resolve(this.certs.find(c => c.certificateId === id) || null);
  }

  async create(tenantId: string, cert: Partial<CertificateOfInsurance>): Promise<CertificateOfInsurance> {
    const newCert = { ...cert, certificateId: cert.certificateId || randomUUID(), tenantId } as CertificateOfInsurance;
    this.certs.push(newCert);
    return Promise.resolve(newCert);
  }

  async revoke(tenantId: string, id: string, reason?: string): Promise<void> {
    const cert = this.certs.find(c => c.certificateId === id);
    if (cert) {
      cert.status = 'Revoked';
      cert.revokedAt = new Date().toISOString();
      cert.revocationReason = reason;
    }
    return Promise.resolve();
  }
}

export class MemoryAccountingRepository implements IAccountingRepository {
  private accounts: GlAccount[] = DEFAULT_CHART_OF_ACCOUNTS.map(a => ({ ...a }));
  private journalEntries: JournalEntry[] = INITIAL_JOURNAL_ENTRIES.map(je => ({
    ...je,
    lines: je.lines.map(l => ({ ...l }))
  }));
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];

  async getAccounts(tenantId: string): Promise<GlAccount[]> { return Promise.resolve(this.accounts); }
  async getJournalEntries(tenantId: string): Promise<JournalEntry[]> { return Promise.resolve(this.journalEntries); }

  async createJournalEntry(tenantId: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const je = { ...entry, entryId: entry.entryId || randomUUID(), tenantId } as JournalEntry;
    this.journalEntries.push(je);

    // Update account balances based on debits and credits
    if (je.lines) {
      // ⚡ Bolt: Use Map for O(1) lookups instead of O(N*M) nested array scans
      const accountMap = new Map(this.accounts.map(a => [a.accountNumber, a]));
      for (const line of je.lines) {
        const acct = accountMap.get(line.accountNumber);
        if (acct) {
          const netChange = (line.debit || 0) - (line.credit || 0);
          if (acct.normalBalance === 'Debit') {
            acct.currentBalance += netChange;
          } else {
            acct.currentBalance += ((line.credit || 0) - (line.debit || 0));
          }
        }
      }
    }

    return Promise.resolve(je);
  }

  async getInvoices(tenantId: string): Promise<Invoice[]> { return Promise.resolve(this.invoices); }

  async createInvoice(tenantId: string, invoice: Partial<Invoice>): Promise<Invoice> {
    const inv = { ...invoice, invoiceId: invoice.invoiceId || randomUUID(), tenantId } as Invoice;
    this.invoices.push(inv);
    return Promise.resolve(inv);
  }

  async getPayments(tenantId: string): Promise<Payment[]> { return Promise.resolve(this.payments); }

  async createPayment(tenantId: string, payment: Partial<Payment>): Promise<Payment> {
    const pmt = { ...payment, paymentId: payment.paymentId || randomUUID(), tenantId } as Payment;
    this.payments.push(pmt);
    return Promise.resolve(pmt);
  }

  async getFinancialSummary(tenantId: string): Promise<FinancialSummary> {
    let totalDebits = 0;
    let totalCredits = 0;

    const trialBalance = this.accounts.map(acct => {
      let debitBalance = 0;
      let creditBalance = 0;

      if (acct.normalBalance === 'Debit') {
        debitBalance = Math.max(0, acct.currentBalance);
        creditBalance = acct.currentBalance < 0 ? Math.abs(acct.currentBalance) : 0;
      } else {
        creditBalance = Math.max(0, acct.currentBalance);
        debitBalance = acct.currentBalance < 0 ? Math.abs(acct.currentBalance) : 0;
      }

      totalDebits += debitBalance;
      totalCredits += creditBalance;

      return {
        accountNumber: acct.accountNumber,
        accountName: acct.accountName,
        category: acct.category,
        debitBalance: Math.round(debitBalance * 100) / 100,
        creditBalance: Math.round(creditBalance * 100) / 100
      };
    });

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    // ⚡ Bolt: Consolidated multiple .find() array scans into a single O(N) loop with early break
    let arAcct: GlAccount | undefined;
    let apAcct: GlAccount | undefined;
    let opCashAcct: GlAccount | undefined;
    let trustCashAcct: GlAccount | undefined;
    let revAcct: GlAccount | undefined;

    let foundCount = 0;
    for (const a of this.accounts) {
      if (!arAcct && a.accountNumber === '1200') { arAcct = a; foundCount++; }
      else if (!apAcct && a.accountNumber === '2000') { apAcct = a; foundCount++; }
      else if (!opCashAcct && a.accountNumber === '1000') { opCashAcct = a; foundCount++; }
      else if (!trustCashAcct && a.accountNumber === '1010') { trustCashAcct = a; foundCount++; }
      else if (!revAcct && a.accountNumber === '4000') { revAcct = a; foundCount++; }
      if (foundCount === 5) break;
    }

    return Promise.resolve({
      trialBalance,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      isBalanced,
      metrics: {
        totalAccountsReceivable: arAcct ? arAcct.currentBalance : 0,
        totalCarrierPayables: apAcct ? apAcct.currentBalance : 0,
        operatingCashBalance: opCashAcct ? opCashAcct.currentBalance : 0,
        trustCashBalance: trustCashAcct ? trustCashAcct.currentBalance : 0,
        ytdCommissionRevenue: revAcct ? revAcct.currentBalance : 0
      }
    });
  }
}

export class MemoryDownloadRepository implements IDownloadRepository {
  private batches: any[] = INITIAL_DOWNLOAD_BATCHES.map(b => ({
    ...b,
    items: b.items ? b.items.map(i => ({ ...i })) : []
  }));
  private txs: any[] = [];

  async getBatches(tenantId: string): Promise<any[]> {
    return Promise.resolve(this.batches.filter(b => !b.tenantId || b.tenantId === tenantId));
  }

  async getBatchById(tenantId: string, id: string): Promise<any | null> {
    return Promise.resolve(this.batches.find(b => b.batchId === id && (!b.tenantId || b.tenantId === tenantId)) || null);
  }

  async createBatch(tenantId: string, batch: any): Promise<any> {
    const b = { ...batch, batchId: batch.batchId || randomUUID(), tenantId };
    this.batches.push(b);
    return Promise.resolve(b);
  }

  async getTransactions(tenantId: string, batchId: string): Promise<any[]> {
    return Promise.resolve(this.txs.filter(t => t.batchId === batchId));
  }
}
