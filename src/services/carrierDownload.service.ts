import { DownloadBatch, DownloadTransactionItem, IngestDownloadBatchPayload } from '../types/download.js';
import { Al3ParserService } from './al3Parser.service.js';
import { AmsService } from './ams.service.js';
import { AccountingService } from './accounting.service.js';

export class CarrierDownloadService {
  private static instance: CarrierDownloadService;

  private batches: DownloadBatch[] = [];
  private al3Parser: Al3ParserService;
  private amsService: AmsService;
  private accountingService: AccountingService;

  private constructor() {
    this.al3Parser = Al3ParserService.getInstance();
    this.amsService = AmsService.getInstance();
    this.accountingService = AccountingService.getInstance();

    // Initialize with a seed download batch for demonstration
    this.seedInitialDownloadBatch();
  }

  public static getInstance(): CarrierDownloadService {
    if (!CarrierDownloadService.instance) {
      CarrierDownloadService.instance = new CarrierDownloadService();
    }
    return CarrierDownloadService.instance;
  }

  public getBatches(tenantId: string = 'tenant-001'): DownloadBatch[] {
    return this.batches.filter(b => b.tenantId === tenantId || !b.tenantId);
  }

  public getBatchById(batchId: string, tenantId: string = 'tenant-001'): DownloadBatch | undefined {
    return this.batches.find(b => b.batchId === batchId && (b.tenantId === tenantId || !b.tenantId));
  }

  /**
   * Ingests a new carrier download package or AL3 stream.
   */
  public ingestDownloadBatch(payload: IngestDownloadBatchPayload, tenantId: string = 'tenant-001'): DownloadBatch {
    const batchId = `BATCH-DL-${Date.now().toString().slice(-6)}`;
    const items: DownloadTransactionItem[] = [];

    let carrierCode = payload.carrierCode || 'TRV01';
    let carrierName = payload.carrierName || 'Travelers Insurance';

    if (payload.rawAl3Content) {
      const parsedPackage = this.al3Parser.parseAl3Content(payload.rawAl3Content);
      carrierCode = parsedPackage.policies[0]?.policy.carrierCode || carrierCode;
      carrierName = parsedPackage.policies[0]?.policy.carrierName || carrierName;

      parsedPackage.policies.forEach((pkgItem, idx) => {
        const item: DownloadTransactionItem = {
          itemId: `DL-ITEM-${batchId}-${idx + 1}`,
          batchId,
          carrierCode: pkgItem.policy.carrierCode,
          carrierName: pkgItem.policy.carrierName,
          policyNumber: pkgItem.policy.policyNumber,
          insuredName: pkgItem.policy.insuredName,
          insuredFeinOrSsn: pkgItem.policy.insuredFeinOrSsn,
          lineOfBusiness: pkgItem.policy.lineOfBusiness,
          transactionType: pkgItem.transaction.transactionCode,
          effectiveDate: pkgItem.transaction.effectiveDate,
          grossPremium: pkgItem.transaction.grossPremium,
          commissionRate: pkgItem.transaction.commissionRate,
          commissionAmount: pkgItem.transaction.commissionAmount,
          netCarrierPayable: pkgItem.transaction.netCarrierPayable,
          reconciliationStatus: 'Matched',
          createdAt: new Date().toISOString()
        };
        items.push(item);
      });
    } else if (payload.items && payload.items.length > 0) {
      payload.items.forEach((pItem, idx) => {
        const gross = pItem.grossPremium;
        const rate = pItem.commissionRate || 0.15;
        const commAmt = Math.round(gross * rate * 100) / 100;

        const item: DownloadTransactionItem = {
          itemId: `DL-ITEM-${batchId}-${idx + 1}`,
          batchId,
          carrierCode,
          carrierName,
          policyNumber: pItem.policyNumber,
          insuredName: pItem.insuredName,
          insuredFeinOrSsn: pItem.insuredFeinOrSsn,
          lineOfBusiness: pItem.lineOfBusiness,
          transactionType: pItem.transactionType,
          effectiveDate: pItem.effectiveDate,
          grossPremium: gross,
          commissionRate: rate,
          commissionAmount: commAmt,
          netCarrierPayable: Math.round((gross - commAmt) * 100) / 100,
          reconciliationStatus: 'Matched',
          createdAt: new Date().toISOString()
        };
        items.push(item);
      });
    }

    // Run Auto-Reconciliation Engine against CoreAMS policies
    this.reconcileItems(items);

    const totalPremium = items.reduce((acc, i) => acc + i.grossPremium, 0);
    const totalCommission = items.reduce((acc, i) => acc + i.commissionAmount, 0);

    const batch: DownloadBatch = {
      batchId,
      tenantId,
      carrierCode,
      carrierName,
      source: payload.source || (payload.rawAl3Content ? 'AL3 Upload Simulation' : 'IVANS Exchange'),
      totalTransactions: items.length,
      totalPremium,
      totalCommission,
      status: 'Reconciled',
      items,
      receivedAt: new Date().toISOString(),
      reconciledAt: new Date().toISOString()
    };

    this.batches.unshift(batch);
    return batch;
  }

  /**
   * Reconciles incoming transaction items against existing CoreAMS policies.
   */
  private reconcileItems(items: DownloadTransactionItem[]) {
    const existingPolicies = this.amsService.getPolicies();
    const existingCustomers = this.amsService.getCustomers();

    // PERFORMANCE OPTIMIZATION:
    // 1. Pre-compute a map for O(1) policy lookups instead of O(N) array scans.
    // 2. Pre-compute lowercased customer names outside the loop to avoid redundant string operations.
    const policyMap = new Map<string, any>();
    for (const p of existingPolicies) {
      policyMap.set(p.policyNumber.toLowerCase(), p);
    }

    const customerSearchData = existingCustomers.map(c => ({
      ...c,
      searchBusName: (c.businessName || '').toLowerCase(),
      searchIndName: `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase()
    }));

    for (const item of items) {
      // 1. Direct Policy Number Match (O(1) lookup)
      const matchedPol = policyMap.get(item.policyNumber.toLowerCase());

      if (matchedPol) {
        item.matchedPolicyId = matchedPol.policyId;
        item.matchedCustomerId = matchedPol.customerId;

        if (item.transactionType === 'RENE') {
          item.reconciliationStatus = 'Policy Renewed';
        } else if (item.transactionType === 'NEWB') {
          item.reconciliationStatus = 'Matched';
        } else {
          item.reconciliationStatus = 'Matched';
        }
      } else {
        // 2. Customer FEIN/Name Fuzzy Match
        const searchName = item.insuredName.toLowerCase();
        const matchedCust = customerSearchData.find(c => {
          if (item.insuredFeinOrSsn && c.feinOrSsn === item.insuredFeinOrSsn) return true;
          return c.searchBusName.includes(searchName) || searchName.includes(c.searchBusName) || c.searchIndName.includes(searchName);
        });

        if (matchedCust) {
          item.matchedCustomerId = matchedCust.customerId;
          item.reconciliationStatus = 'New Policy Created';

          // Auto-create policy for customer
          try {
            const newPol = this.amsService.createPolicy({
              customerId: matchedCust.customerId,
              policyNumber: item.policyNumber,
              lineOfBusiness: item.lineOfBusiness as any,
              effectiveDate: item.effectiveDate,
              expirationDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
              premiumAmount: item.grossPremium,
              commissionRate: item.commissionRate,
              billingType: 'Direct Bill',
              carrierId: 'CARR-1001'
            });
            item.matchedPolicyId = newPol.policyId;
          } catch {
            item.reconciliationStatus = 'Discrepancy';
            item.discrepancyReason = 'Failed to auto-provision matched customer policy';
          }
        } else {
          item.reconciliationStatus = 'Discrepancy';
          item.discrepancyReason = `No matching policy or customer found for Policy #${item.policyNumber} (${item.insuredName})`;
        }
      }
    }
  }

  /**
   * Posts direct-bill commissions for a download batch directly into the General Ledger.
   * Debits Trust/Operating Cash (1000), Credits Commission Revenue (4000) & Carrier Payable (2000).
   */
  public postBatchCommissions(batchId: string, tenantId: string = 'tenant-001') {
    const batch = this.getBatchById(batchId, tenantId);
    if (!batch) {
      throw new Error(`Download batch ${batchId} not found`);
    }

    if (batch.status === 'Commissions Posted') {
      return batch;
    }

    for (const item of batch.items) {
      if (item.commissionAmount > 0 && item.reconciliationStatus !== 'Discrepancy') {
        const je = this.accountingService.postJournalEntry({
          memo: `Direct Bill Commission Posting - Policy #${item.policyNumber} (${item.carrierName})`,
          reference: item.itemId,
          lines: [
            {
              accountNumber: '1000', // Cash Received
              debit: item.commissionAmount,
              credit: 0
            },
            {
              accountNumber: '4000', // Commission Revenue
              debit: 0,
              credit: item.commissionAmount
            }
          ]
        });

        item.glJournalEntryId = je.entryId;
        item.reconciliationStatus = 'Commissions Posted';
      }
    }

    batch.status = 'Commissions Posted';
    batch.postedAt = new Date().toISOString();
    return batch;
  }

  private seedInitialDownloadBatch() {
    const seedPayload: IngestDownloadBatchPayload = {
      carrierCode: 'TRV01',
      carrierName: 'Travelers Insurance',
      source: 'IVANS Exchange',
      items: [
        {
          policyNumber: 'POL-COMM-1001',
          insuredName: 'Acme Logistics LLC',
          insuredFeinOrSsn: '36-9876543',
          lineOfBusiness: 'Commercial Auto',
          transactionType: 'RENE',
          effectiveDate: new Date().toISOString().split('T')[0],
          grossPremium: 12500,
          commissionRate: 0.15
        },
        {
          policyNumber: 'POL-COMM-1002',
          insuredName: 'Midwest Industrial Supplies',
          insuredFeinOrSsn: '36-1122334',
          lineOfBusiness: 'General Liability',
          transactionType: 'DBST',
          effectiveDate: new Date().toISOString().split('T')[0],
          grossPremium: 8400,
          commissionRate: 0.15
        },
        {
          policyNumber: 'POL-NEW-9044',
          insuredName: 'Apex Transport Group',
          insuredFeinOrSsn: '36-7788990',
          lineOfBusiness: 'Workers Compensation',
          transactionType: 'NEWB',
          effectiveDate: new Date().toISOString().split('T')[0],
          grossPremium: 16200,
          commissionRate: 0.12
        }
      ]
    };

    this.ingestDownloadBatch(seedPayload, 'tenant-001');
  }
}
