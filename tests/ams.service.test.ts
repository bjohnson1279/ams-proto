import { jest } from '@jest/globals';
import { AmsService } from '../src/services/ams.service.js';
import { AccountingService } from '../src/services/accounting.service.js';

describe('AmsService', () => {
  let amsService: AmsService;
  let accountingService: AccountingService;

  beforeEach(() => {
    amsService = AmsService.getInstance();
    accountingService = AccountingService.getInstance();
  });

  describe('createPolicy', () => {
    it('should create a policy and handle exception if auto-generate invoice fails for Agency Bill', async () => {
      const generateInvoiceSpy = jest.spyOn(accountingService, 'generateInvoiceForPolicy').mockRejectedValue(
        new Error('Invoice generation failed')
      );
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const payload = {
        customerId: 'CUST-1001',
        carrierId: 'CARRIER-001',
        lineOfBusiness: 'Commercial Auto',
        effectiveDate: '2026-06-01',
        expirationDate: '2027-06-01',
        status: 'Active',
        premiumAmount: 12500,
        billingType: 'Agency Bill'
      };

      const result = await amsService.createPolicy('tenant-001', payload as any);

      expect(generateInvoiceSpy).toHaveBeenCalledWith(
        'tenant-001',
        expect.objectContaining({
          policyId: result.policyId
        })
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to auto-generate invoice for policy:', expect.any(Error));

      expect(result.policyId).toBeDefined();
      expect(result.billingStatus).not.toBe('Invoiced');

      generateInvoiceSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
