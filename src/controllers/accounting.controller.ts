import { Request, Response } from 'express';
import { AccountingService } from '../services/accounting.service.js';
import { AmsService } from '../services/ams.service.js';

export class AccountingController {
  private accountingService = AccountingService.getInstance();
  private amsService = AmsService.getInstance();

  public getAccounts = (_req: Request, res: Response): void => {
    const accounts = this.accountingService.getAccounts();
    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  };

  public getJournalEntries = (_req: Request, res: Response): void => {
    const entries = this.accountingService.getJournalEntries();
    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries
    });
  };

  public postJournalEntry = (req: Request, res: Response): void => {
    try {
      const { reference, memo, lines, entryDate } = req.body;
      if (!reference || !lines || !Array.isArray(lines) || lines.length === 0) {
        res.status(400).json({
          success: false,
          error: "Invalid payload. 'reference' and a non-empty 'lines' array are required."
        });
        return;
      }

      const entry = this.accountingService.postJournalEntry({
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
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to post Journal Entry'
      });
    }
  };

  public getInvoices = (_req: Request, res: Response): void => {
    const invoices = this.accountingService.getInvoices();
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  };

  public getInvoiceById = (req: Request, res: Response): void => {
    const { id } = req.params;
    const invoice = this.accountingService.getInvoiceById(id);
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
  };

  public generateInvoice = (req: Request, res: Response): void => {
    try {
      const { policyId, commissionRate } = req.body;
      if (!policyId) {
        res.status(400).json({
          success: false,
          error: "Missing required parameter 'policyId'."
        });
        return;
      }

      const policy = this.amsService.getPolicyById(policyId);
      if (!policy) {
        res.status(404).json({
          success: false,
          error: `Policy '${policyId}' not found.`
        });
        return;
      }

      const invoice = this.accountingService.generateInvoiceForPolicy(policy, commissionRate);
      policy.billingStatus = 'Invoiced';

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

  public getPayments = (_req: Request, res: Response): void => {
    const payments = this.accountingService.getPayments();
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  };

  public receivePayment = (req: Request, res: Response): void => {
    try {
      const { invoiceId, amount, paymentMethod, referenceNumber, depositAccount } = req.body;
      if (!invoiceId || !amount || !paymentMethod || !referenceNumber) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: 'invoiceId', 'amount', 'paymentMethod', 'referenceNumber'."
        });
        return;
      }

      const payment = this.accountingService.receivePayment({
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

  public getFinancialSummary = (_req: Request, res: Response): void => {
    const summary = this.accountingService.getFinancialSummary();
    res.status(200).json({
      success: true,
      data: summary
    });
  };
}
