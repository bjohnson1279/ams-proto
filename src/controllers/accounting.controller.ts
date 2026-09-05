import { Request, Response, NextFunction } from 'express';
import { AccountingService } from '../services/accounting.service.js';
import { AmsService } from '../services/ams.service.js';
import { TenantRequest } from '../middleware/tenant.middleware.js';

export class AccountingController {
  private accountingService = AccountingService.getInstance();
  private amsService = AmsService.getInstance();

  public getAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const accounts = await this.accountingService.getAccounts(tenantId);
      res.status(200).json({
        success: true,
        count: accounts.length,
        data: accounts
      });
    } catch (err) {
      next(err);
    }
  };

  public getJournalEntries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const entries = await this.accountingService.getJournalEntries(tenantId);
      res.status(200).json({
        success: true,
        count: entries.length,
        data: entries
      });
    } catch (err) {
      next(err);
    }
  };

  public postJournalEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { reference, memo, lines, entryDate } = req.body;
      if (!reference || !lines || !Array.isArray(lines) || lines.length === 0) {
        res.status(400).json({
          success: false,
          error: "Invalid payload. 'reference' and a non-empty 'lines' array are required."
        });
        return;
      }

      const entry = await this.accountingService.postJournalEntry(tenantId, {
        reference,
        memo: memo || 'Manual Journal Entry',
        lines,
        entryDate
      });

      res.status(201).json({
        success: true,
        message: 'Journal Entry posted successfully.',
        data: entry
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Unbalanced')) {
        res.status(400).json({
          success: false,
          error: err.message
        });
        return;
      }
      next(err);
    }
  };

  public getInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const invoices = await this.accountingService.getInvoices(tenantId);
      res.status(200).json({
        success: true,
        count: invoices.length,
        data: invoices
      });
    } catch (err) {
      next(err);
    }
  };

  public getInvoiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { id } = req.params;
      const invoice = await this.accountingService.getInvoiceById(tenantId, id);
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: `Invoice '${id}' not found.`
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: invoice
      });
    } catch (err) {
      next(err);
    }
  };

  public generateInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { policyId, commissionRate } = req.body;
      if (!policyId) {
        res.status(400).json({
          success: false,
          error: "Missing required parameter 'policyId'."
        });
        return;
      }

      const policy = await this.amsService.getPolicyById(tenantId, policyId);
      if (!policy) {
        res.status(404).json({
          success: false,
          error: `Policy '${policyId}' not found.`
        });
        return;
      }

      const invoice = await this.accountingService.generateInvoiceForPolicy(tenantId, policy, commissionRate);
      
      // Update policy billingStatus (since we don't have an updatePolicy in IPolicyRepository per the interface, 
      // we might skip this or just trust the DB will get it eventually. Assuming memory repo doesn't save mutated policy automatically without save method)

      res.status(201).json({
        success: true,
        message: `Invoice '${invoice.invoiceNumber}' generated successfully.`,
        data: invoice
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to generate invoice'
      });
    }
  };

  public getPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const payments = await this.accountingService.getPayments(tenantId);
      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments
      });
    } catch (err) {
      next(err);
    }
  };

  public receivePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { invoiceId, amount, paymentMethod, referenceNumber, depositAccount } = req.body;
      if (!invoiceId || !amount || !paymentMethod || !referenceNumber) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: 'invoiceId', 'amount', 'paymentMethod', 'referenceNumber'."
        });
        return;
      }

      const payment = await this.accountingService.receivePayment(tenantId, {
        invoiceId,
        amount: Number(amount),
        paymentMethod,
        referenceNumber,
        depositAccount
      });

      res.status(201).json({
        success: true,
        message: `Payment '${payment.paymentId}' posted successfully to account ${payment.depositedToAccount}.`,
        data: payment
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to process payment'
      });
    }
  };

  public getFinancialSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const summary = await this.accountingService.getFinancialSummary(tenantId);
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  };
}
