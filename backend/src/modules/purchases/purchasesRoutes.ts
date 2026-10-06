import { Router } from 'express';
import {
  // Suppliers
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  paySupplierBalance,
  // Purchase Invoices
  getPurchaseInvoices,
  getPurchaseInvoiceById,
  createPurchaseInvoice,
  recordSupplierPayment,
  deletePurchaseInvoice
} from './purchasesController';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

// 1. Suppliers endpoints (before wildcard /:id)
router.get('/suppliers', requirePermission('inventory.view'), getSuppliers);
router.post('/suppliers', requirePermission('inventory.manage'), createSupplier);
router.get('/suppliers/:id', requirePermission('inventory.view'), getSupplierById);
router.put('/suppliers/:id', requirePermission('inventory.manage'), updateSupplier);
router.delete('/suppliers/:id', requireRole('owner', 'manager'), deleteSupplier);
router.post('/suppliers/:id/pay', requirePermission('inventory.manage'), paySupplierBalance);

// 2. Purchase Invoices endpoints
router.get('/', requirePermission('inventory.view'), getPurchaseInvoices);
router.get('/:id', requirePermission('inventory.view'), getPurchaseInvoiceById);
router.post('/', requirePermission('inventory.manage'), createPurchaseInvoice);
router.post('/:id/payments', requirePermission('inventory.manage'), recordSupplierPayment);
router.delete('/:id', requireRole('owner', 'manager'), deletePurchaseInvoice);

export default router;
