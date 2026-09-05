import { CarrierDownloadService } from '../src/services/carrierDownload.service.js';
import { AccountingService } from '../src/services/accounting.service.js';

describe('Carrier Download Processing Service', () => {
  const downloadService = CarrierDownloadService.getInstance();
  const accountingService = AccountingService.getInstance();

  it('should list initial seed download batches', async () => {
    const batches = await downloadService.getBatches('tenant-001');
    expect(batches.length).toBeGreaterThan(0);
    expect(batches[0].carrierCode).toBe('TRV01');
  });

  it('should ingest and auto-reconcile a download payload', async () => {
    const batch = await downloadService.ingestDownloadBatch('tenant-001', {
      carrierCode: 'HART01',
      carrierName: 'The Hartford',
      source: 'IVANS Exchange',
      items: [
        {
          policyNumber: 'POL-COMM-1001',
          insuredName: 'Acme Logistics LLC',
          insuredFeinOrSsn: '36-9876543',
          lineOfBusiness: 'Commercial Auto',
          transactionType: 'RENE',
          effectiveDate: '2026-08-01',
          grossPremium: 10000,
          commissionRate: 0.15
        }
      ]
    });

    expect(batch.batchId).toBeDefined();
    expect(batch.status).toBe('Reconciled');
    expect(batch.totalTransactions).toBe(1);
    expect(batch.items[0].reconciliationStatus).toBe('Policy Renewed');
    expect(batch.items[0].commissionAmount).toBe(1500);
  });

  it('should post direct-bill commissions to the General Ledger', async () => {
    const batch = await downloadService.ingestDownloadBatch('tenant-001', {
      carrierCode: 'TRV01',
      carrierName: 'Travelers Insurance',
      source: 'Direct Download',
      items: [
        {
          policyNumber: 'POL-DB-5510',
          insuredName: 'Midwest Industrial Supplies',
          lineOfBusiness: 'General Liability',
          transactionType: 'DBST',
          effectiveDate: '2026-08-01',
          grossPremium: 5000,
          commissionRate: 0.15
        }
      ]
    });

    const updatedBatch = await downloadService.postBatchCommissions('tenant-001', batch.batchId);
    expect(updatedBatch.status).toBe('Commissions Posted');
    expect(updatedBatch.items[0].glJournalEntryId).toBeDefined();

    // Verify trial balance reflected cash receipt & commission revenue
    const tb = await accountingService.getTrialBalance('tenant-001');
    const cashAcc = tb.trialBalance.find((a: any) => a.accountNumber === '1000');
    const revAcc = tb.trialBalance.find((a: any) => a.accountNumber === '4000');

    expect(cashAcc?.debitBalance).toBeGreaterThan(0);
    expect(revAcc?.creditBalance).toBeGreaterThan(0);
  });
});
