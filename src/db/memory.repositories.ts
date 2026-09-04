import {
  ICustomerRepository, IPolicyRepository, ICarrierRepository,
  ICertificateHolderRepository, ICertificateRepository,
  IAccountingRepository, IDownloadRepository
} from './repository.interfaces.js';
import {
  Customer, Policy, Carrier, CertificateHolder, CertificateOfInsurance,
  GlAccount, JournalEntry, Invoice, Payment, FinancialSummary
} from '../types/domain.js';
import { INITIAL_CUSTOMERS, INITIAL_POLICIES, INITIAL_CARRIERS, INITIAL_CERTIFICATE_HOLDERS, INITIAL_CERTIFICATES } from '../data/seedData.js';
import { randomUUID } from 'crypto';

export class MemoryCustomerRepository implements ICustomerRepository {
  private customers = [...INITIAL_CUSTOMERS];

  async getAll(tenantId: string, filter?: any): Promise<Customer[]> {
    return Promise.resolve(this.customers);
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
    return Promise.resolve(this.policies);
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
    return Promise.resolve(this.holders.filter(h => !h.deactivatedAt));
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
    return Promise.resolve(this.certs);
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
  private accounts: GlAccount[] = [];
  private journalEntries: JournalEntry[] = [];
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];

  async getAccounts(tenantId: string): Promise<GlAccount[]> { return Promise.resolve(this.accounts); }
  async getJournalEntries(tenantId: string): Promise<JournalEntry[]> { return Promise.resolve(this.journalEntries); }
  async createJournalEntry(tenantId: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const je = { ...entry, entryId: entry.entryId || randomUUID() } as JournalEntry;
    this.journalEntries.push(je);
    return Promise.resolve(je);
  }
  async getInvoices(tenantId: string): Promise<Invoice[]> { return Promise.resolve(this.invoices); }
  async createInvoice(tenantId: string, invoice: Partial<Invoice>): Promise<Invoice> {
    const inv = { ...invoice, invoiceId: invoice.invoiceId || randomUUID() } as Invoice;
    this.invoices.push(inv);
    return Promise.resolve(inv);
  }
  async getPayments(tenantId: string): Promise<Payment[]> { return Promise.resolve(this.payments); }
  async createPayment(tenantId: string, payment: Partial<Payment>): Promise<Payment> {
    const pmt = { ...payment, paymentId: payment.paymentId || randomUUID() } as Payment;
    this.payments.push(pmt);
    return Promise.resolve(pmt);
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

export class MemoryDownloadRepository implements IDownloadRepository {
  private batches: any[] = [];
  private txs: any[] = [];

  async getBatches(tenantId: string): Promise<any[]> { return Promise.resolve(this.batches); }
  async getBatchById(tenantId: string, id: string): Promise<any | null> { return Promise.resolve(this.batches.find(b => b.batchId === id) || null); }
  async createBatch(tenantId: string, batch: any): Promise<any> {
    const b = { ...batch, batchId: batch.batchId || randomUUID() };
    this.batches.push(b);
    return Promise.resolve(b);
  }
  async getTransactions(tenantId: string, batchId: string): Promise<any[]> { return Promise.resolve(this.txs.filter(t => t.batchId === batchId)); }
}
