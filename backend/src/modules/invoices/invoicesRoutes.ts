import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  registerPayment,
  getExpenses,
  createExpense,
  deleteInvoice,
  deleteExpense
} from './invoicesController';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

// Expenses (Specific sub-routes must be placed before generic /:id)
router.get('/expenses/list', requirePermission('expenses.view'), getExpenses);
router.post('/expenses', requirePermission('expenses.create'), createExpense);
router.delete('/expenses/:id', requireRole('owner', 'manager', 'accountant'), deleteExpense);

// Invoices & Payments
router.get('/', requirePermission('invoices.view'), getInvoices);
router.post('/', requirePermission('invoices.create'), createInvoice);
router.post('/payments', requirePermission('payments.create'), registerPayment);
router.get('/:id', requirePermission('invoices.view'), getInvoiceById);
router.delete('/:id', requireRole('owner', 'manager', 'accountant'), deleteInvoice);

export default router;
