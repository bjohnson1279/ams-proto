export type Al3TransactionType = 'NEWB' | 'RENE' | 'ENDO' | 'CANC' | 'REVT' | 'DBST';

export interface Al3GroupHeader {
  groupType: string; // '2BOS'
  senderId: string;
  receiverId: string;
  sequenceNumber: string;
  createdDate: string;
}

export interface Al3PolicyHeader {
  recordType: string; // '2PRT'
  carrierCode: string;
  carrierName: string;
  policyNumber: string;
  lineOfBusiness: string;
  effectiveDate: string;
  expirationDate: string;
  insuredName: string;
  insuredFeinOrSsn?: string;
  insuredAddress?: string;
  premiumAmount: number;
}

export interface Al3CoverageRecord {
  recordType: string; // '3CVI'
  coverageCode: string;
  coverageDescription: string;
  limit1?: number;
  limit2?: number;
  deductible?: number;
  premium: number;
}

export interface Al3TransactionDetail {
  recordType: string; // '3TRG'
  transactionCode: Al3TransactionType;
  effectiveDate: string;
  grossPremium: number;
  commissionRate: number; // e.g. 0.15
  commissionAmount: number;
  netCarrierPayable: number;
  statementNumber?: string;
}

export interface Al3ParsedPackage {
  header: Al3GroupHeader;
  policies: Array<{
    policy: Al3PolicyHeader;
    coverages: Al3CoverageRecord[];
    transaction: Al3TransactionDetail;
  }>;
  trailer: {
    recordType: string; // '2EOS'
    totalRecords: number;
  };
}

export type ReconciliationStatus = 'Matched' | 'Discrepancy' | 'New Policy Created' | 'Policy Renewed' | 'Commissions Posted';

export interface DownloadTransactionItem {
  itemId: string;
  batchId: string;
  carrierCode: string;
  carrierName: string;
  policyNumber: string;
  insuredName: string;
  insuredFeinOrSsn?: string;
  lineOfBusiness: string;
  transactionType: Al3TransactionType;
  effectiveDate: string;
  grossPremium: number;
  commissionRate: number;
  commissionAmount: number;
  netCarrierPayable: number;
  matchedPolicyId?: string;
  matchedCustomerId?: string;
  reconciliationStatus: ReconciliationStatus;
  discrepancyReason?: string;
  glJournalEntryId?: string;
  createdAt: string;
}

export interface DownloadBatch {
  batchId: string;
  tenantId: string;
  carrierCode: string;
  carrierName: string;
  source: 'IVANS Exchange' | 'Direct Download' | 'AL3 Upload Simulation';
  totalTransactions: number;
  totalPremium: number;
  totalCommission: number;
  status: 'Received' | 'Reconciled' | 'Commissions Posted' | 'Error';
  items: DownloadTransactionItem[];
  receivedAt: string;
  reconciledAt?: string;
  postedAt?: string;
}

export interface IngestDownloadBatchPayload {
  carrierCode: string;
  carrierName: string;
  source?: 'IVANS Exchange' | 'Direct Download' | 'AL3 Upload Simulation';
  rawAl3Content?: string;
  items?: Array<{
    policyNumber: string;
    insuredName: string;
    insuredFeinOrSsn?: string;
    lineOfBusiness: string;
    transactionType: Al3TransactionType;
    effectiveDate: string;
    grossPremium: number;
    commissionRate?: number;
  }>;
}
