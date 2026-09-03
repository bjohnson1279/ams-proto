import {
  GlAccount,
  JournalEntry,
  JournalLine,
  Invoice,
  Payment,
  FinancialSummary,
  Policy
} from '../types/domain.js';

export const DEFAULT_CHART_OF_ACCOUNTS: GlAccount[] = [
  { accountNumber: '1000', accountName: 'Cash - Operating Account', category: 'Asset', isTrustAccount: false, normalBalance: 'Debit', currentBalance: 125000.00 },
  { accountNumber: '1010', accountName: 'Cash - Premium Fiduciary Trust Account', category: 'Asset', isTrustAccount: true, normalBalance: 'Debit', currentBalance: 45000.00 },
  { accountNumber: '1200', accountName: 'Accounts Receivable - Agency Bill', category: 'Asset', isTrustAccount: false, normalBalance: 'Debit', currentBalance: 18500.00 },
  { accountNumber: '1300', accountName: 'Commission Receivable - Direct Bill', category: 'Asset', isTrustAccount: false, normalBalance: 'Debit', currentBalance: 3200.00 },
  { accountNumber: '2000', accountName: 'Accounts Payable - Carrier Premiums Due', category: 'Liability', isTrustAccount: true, normalBalance: 'Credit', currentBalance: 38250.00 },
  { accountNumber: '3000', accountName: 'Retained Earnings / Agency Equity', category: 'Equity', isTrustAccount: false, normalBalance: 'Credit', currentBalance: 128450.00 },
  { accountNumber: '4000', accountName: 'Agency Commission Revenue', category: 'Revenue', isTrustAccount: false, normalBalance: 'Credit', currentBalance: 25000.00 },
  { accountNumber: '5000', accountName: 'Producer Commission Expense', category: 'Expense', isTrustAccount: false, normalBalance: 'Debit', currentBalance: 0.00 }
];

export class AccountingService {
  private static instance: AccountingService;

  private accounts: GlAccount[] = [...DEFAULT_CHART_OF_ACCOUNTS];
  private journalEntries: JournalEntry[] = [];
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];

  private constructor() {
    this.seedInitialTransactions();
  }

  public static getInstance(): AccountingService {
    if (!AccountingService.instance) {
      AccountingService.instance = new AccountingService();
    }
    return AccountingService.instance;
  }

  private seedInitialTransactions() {
    // Seed initial balancing journal entry
    const initialEntry: JournalEntry = {
      entryId: 'JE-SEED-001',
      entryDate: '2026-01-01',
      reference: 'OPENING-BALANCE',
      memo: 'Initial Chart of Accounts Trial Balance Opening Entry',
      lines: [
        { accountNumber: '1000', description: 'Opening Operating Cash', debit: 125000.00, credit: 0 },
        { accountNumber: '1010', description: 'Opening Fiduciary Trust Cash', debit: 45000.00, credit: 0 },
        { accountNumber: '1200', description: 'Opening Accounts Receivable', debit: 18500.00, credit: 0 },
        { accountNumber: '1300', description: 'Opening Direct Bill Comm Rec', debit: 3200.00, credit: 0 },
        { accountNumber: '2000', description: 'Opening Carrier Payables', debit: 0, credit: 38250.00 },
        { accountNumber: '3000', description: 'Opening Agency Equity', debit: 0, credit: 128450.00 },
        { accountNumber: '4000', description: 'Opening YTD Commission Revenue', debit: 0, credit: 25000.00 }
      ],
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    this.journalEntries.push(initialEntry);
  }

  public getAccounts(): GlAccount[] {
    return this.accounts;
  }

  public getAccountByNumber(accountNumber: string): GlAccount | undefined {
    return this.accounts.find(a => a.accountNumber === accountNumber);
  }

  public getJournalEntries(): JournalEntry[] {
    return this.journalEntries;
  }

  public getInvoices(): Invoice[] {
    return this.invoices;
  }

  public getInvoiceById(invoiceId: string): Invoice | undefined {
    return this.invoices.find(i => i.invoiceId === invoiceId || i.invoiceNumber === invoiceId);
  }

  public getPayments(): Payment[] {
    return this.payments;
  }

  /**
   * Posts a double-entry journal entry. Enforces strict Debit === Credit balance rules.
   */
  public postJournalEntry(payload: {
    reference: string;
    memo: string;
    lines: JournalLine[];
    entryDate?: string;
  }): JournalEntry {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of payload.lines) {
      const acct = this.getAccountByNumber(line.accountNumber);
      if (!acct) {
        throw new Error(`Invalid GL Account Number '${line.accountNumber}' in journal entry line.`);
      }
      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;
    }

    // Rounding safety to 2 decimal places
    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;

    if (Math.abs(roundedDebit - roundedCredit) > 0.01) {
      throw new Error(`Unbalanced Journal Entry! Total Debits ($${roundedDebit.toFixed(2)}) must equal Total Credits ($${roundedCredit.toFixed(2)}).`);
    }

    const newEntry: JournalEntry = {
      entryId: `JE-${Date.now()}`,
      entryDate: payload.entryDate || new Date().toISOString().split('T')[0],
      reference: payload.reference,
      memo: payload.memo,
      lines: payload.lines,
      createdAt: new Date().toISOString()
    };

    // Update GL account current balances
    for (const line of payload.lines) {
      const acct = this.getAccountByNumber(line.accountNumber)!;
      const netChange = (line.debit || 0) - (line.credit || 0);
      if (acct.normalBalance === 'Debit') {
        acct.currentBalance += netChange;
      } else {
        acct.currentBalance -= netChange;
      }
    }

    this.journalEntries.push(newEntry);
    return newEntry;
  }

  /**
   * Auto-generates an Agency Bill invoice for a policy and posts the double-entry GL transaction.
   * Debit: Accounts Receivable (1200) - Gross Premium
   * Credit: Carrier Premium Payable (2000) - Net Premium (85%)
   * Credit: Agency Commission Revenue (4000) - Commission (15%)
   */
  public generateInvoiceForPolicy(policy: Policy, commissionRateOverride?: number): Invoice {
    const grossPremium = policy.premiumAmount;
    const commRate = commissionRateOverride ?? policy.commissionRate ?? 15.0; // Default 15%
    const commAmount = Math.round((grossPremium * (commRate / 100)) * 100) / 100;
    const netCarrierPayable = Math.round((grossPremium - commAmount) * 100) / 100;

    const nextInvNum = 1000 + this.invoices.length + 1;
    const invoiceId = `INV-${nextInvNum}`;
    const invoiceNumber = `INV-2026-${nextInvNum}`;

    const lines: JournalLine[] = [
      {
        accountNumber: '1200',
        description: `AR Gross Premium Invoice ${invoiceNumber} for Policy ${policy.policyNumber}`,
        debit: grossPremium,
        credit: 0
      },
      {
        accountNumber: '2000',
        description: `Net Carrier Payable (100% - ${commRate}% comm)`,
        debit: 0,
        credit: netCarrierPayable
      },
      {
        accountNumber: '4000',
        description: `Agency Commission Revenue (${commRate}%)`,
        debit: 0,
        credit: commAmount
      }
    ];

    const je = this.postJournalEntry({
      reference: invoiceNumber,
      memo: `Agency Bill Invoicing for Policy ${policy.policyNumber} (Insured ${policy.customerId})`,
      lines
    });

    const newInvoice: Invoice = {
      invoiceId,
      invoiceNumber,
      customerId: policy.customerId,
      policyId: policy.policyId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      grossPremium,
      agencyCommissionRate: commRate,
      agencyCommissionAmount: commAmount,
      netCarrierPayable,
      status: 'Posted',
      amountPaid: 0,
      balanceDue: grossPremium,
      lineItems: [
        {
          description: `${policy.lineOfBusiness} Gross Premium`,
          amount: grossPremium,
          accountNumber: '1200'
        }
      ],
      journalEntryId: je.entryId,
      createdAt: new Date().toISOString()
    };

    this.invoices.push(newInvoice);
    return newInvoice;
  }

  /**
   * Receives customer premium payment for an invoice and posts GL entry to Fiduciary Trust Cash.
   * Debit: Cash - Premium Fiduciary Trust (1010)
   * Credit: Accounts Receivable (1200)
   */
  public receivePayment(payload: {
    invoiceId: string;
    amount: number;
    paymentMethod: 'Check' | 'ACH' | 'Credit_Card' | 'Wire';
    referenceNumber: string;
    depositAccount?: string; // Default 1010 (Trust)
  }): Payment {
    const invoice = this.getInvoiceById(payload.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice '${payload.invoiceId}' not found.`);
    }

    if (payload.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const depositAccount = payload.depositAccount || '1010'; // Fiduciary Trust Account
    const payId = `PAY-${Date.now()}`;

    // Post double-entry payment transaction
    const je = this.postJournalEntry({
      reference: `PAY-${payload.referenceNumber}`,
      memo: `Payment Received for Invoice ${invoice.invoiceNumber} (${payload.paymentMethod})`,
      lines: [
        {
          accountNumber: depositAccount,
          description: `Customer Cash Receipt (${payload.paymentMethod})`,
          debit: payload.amount,
          credit: 0
        },
        {
          accountNumber: '1200',
          description: `AR Clear for Invoice ${invoice.invoiceNumber}`,
          debit: 0,
          credit: payload.amount
        }
      ]
    });

    const payment: Payment = {
      paymentId: payId,
      invoiceId: invoice.invoiceId,
      customerId: invoice.customerId,
      paymentDate: new Date().toISOString().split('T')[0],
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      referenceNumber: payload.referenceNumber,
      depositedToAccount: depositAccount,
      createdAt: new Date().toISOString()
    };

    // Update invoice status & balance
    invoice.amountPaid += payload.amount;
    invoice.balanceDue = Math.max(0, invoice.grossPremium - invoice.amountPaid);
    if (invoice.balanceDue === 0) {
      invoice.status = 'Paid';
    } else {
      invoice.status = 'Partially_Paid';
    }

    this.payments.push(payment);
    return payment;
  }

  /**
   * Generates full Trial Balance and key financial health metrics.
   */
  public getFinancialSummary(): FinancialSummary {
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

    // ⚡ Bolt: Replaced multiple distinct .find() lookups with a single for...of loop to prevent redundant O(N) array scans.
    // Preserves .find() behavior by breaking early when all targets are matched.
    let arAcct, apAcct, opCashAcct, trustCashAcct, revAcct;
    let foundCount = 0;
    for (const acct of this.accounts) {
      if (!arAcct && acct.accountNumber === '1200') { arAcct = acct; foundCount++; }
      else if (!apAcct && acct.accountNumber === '2000') { apAcct = acct; foundCount++; }
      else if (!opCashAcct && acct.accountNumber === '1000') { opCashAcct = acct; foundCount++; }
      else if (!trustCashAcct && acct.accountNumber === '1010') { trustCashAcct = acct; foundCount++; }
      else if (!revAcct && acct.accountNumber === '4000') { revAcct = acct; foundCount++; }

      if (foundCount === 5) break;
    }

    return {
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
    };
  }

  public getTrialBalance(_tenantId?: string): FinancialSummary {
    return this.getFinancialSummary();
  }
}
