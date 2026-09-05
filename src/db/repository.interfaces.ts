import {
  Customer,
  Policy,
  Carrier,
  CertificateHolder,
  CertificateOfInsurance,
  GlAccount,
  JournalEntry,
  Invoice,
  Payment,
  FinancialSummary
} from '../types/domain.js';

export interface ICustomerRepository {
  getAll(tenantId: string, filter?: any): Promise<Customer[]>;
  getById(tenantId: string, id: string): Promise<Customer | null>;
  create(tenantId: string, payload: Partial<Customer>): Promise<Customer>;
}

export interface IPolicyRepository {
  getAll(tenantId: string, filter?: any): Promise<Policy[]>;
  getById(tenantId: string, id: string): Promise<Policy | null>;
  create(tenantId: string, payload: Partial<Policy>): Promise<Policy>;
}

export interface ICarrierRepository {
  getAll(tenantId: string): Promise<Carrier[]>;
  getById(tenantId: string, id: string): Promise<Carrier | null>;
}

export interface ICertificateHolderRepository {
  getAll(tenantId: string, filter?: any): Promise<CertificateHolder[]>;
  getById(tenantId: string, id: string): Promise<CertificateHolder | null>;
  create(tenantId: string, payload: Partial<CertificateHolder>): Promise<CertificateHolder>;
  update(tenantId: string, id: string, payload: Partial<CertificateHolder>): Promise<CertificateHolder>;
  deactivate(tenantId: string, id: string): Promise<void>;
}

export interface ICertificateRepository {
  getAll(tenantId: string, filter?: any): Promise<CertificateOfInsurance[]>;
  getById(tenantId: string, id: string): Promise<CertificateOfInsurance | null>;
  create(tenantId: string, cert: Partial<CertificateOfInsurance>): Promise<CertificateOfInsurance>;
  revoke(tenantId: string, id: string, reason?: string): Promise<void>;
}

export interface IAccountingRepository {
  getAccounts(tenantId: string): Promise<GlAccount[]>;
  getJournalEntries(tenantId: string): Promise<JournalEntry[]>;
  createJournalEntry(tenantId: string, entry: Partial<JournalEntry>): Promise<JournalEntry>;
  getInvoices(tenantId: string): Promise<Invoice[]>;
  createInvoice(tenantId: string, invoice: Partial<Invoice>): Promise<Invoice>;
  getPayments(tenantId: string): Promise<Payment[]>;
  createPayment(tenantId: string, payment: Partial<Payment>): Promise<Payment>;
  getFinancialSummary(tenantId: string): Promise<FinancialSummary>;
}

export interface IDownloadRepository {
  getBatches(tenantId: string): Promise<any[]>;
  getBatchById(tenantId: string, id: string): Promise<any | null>;
  createBatch(tenantId: string, batch: any): Promise<any>;
  getTransactions(tenantId: string, batchId: string): Promise<any[]>;
}
