import { Router } from 'express';
import { AccountingController } from '../controllers/accounting.controller.js';

const router = Router();
const controller = new AccountingController();

// Chart of Accounts & General Ledger
router.get('/accounts', controller.getAccounts);
router.get('/journal-entries', controller.getJournalEntries);
router.post('/journal-entries', controller.postJournalEntry);

// Invoices & Invoicing Engine
router.get('/invoices', controller.getInvoices);
router.get('/invoices/:id', controller.getInvoiceById);
router.post('/invoices/generate', controller.generateInvoice);

// Cash Receipts & Payments
router.get('/payments', controller.getPayments);
router.post('/payments', controller.receivePayment);

// Financial Reports & Trial Balance
router.get('/financial-summary', controller.getFinancialSummary);

export default router;
