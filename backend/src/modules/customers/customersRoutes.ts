import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from './customersController';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('customers.view'), getCustomers);
router.get('/:id', requirePermission('customers.view'), getCustomerById);
router.post('/', requirePermission('customers.create'), createCustomer);
router.put('/:id', requirePermission('customers.update'), updateCustomer);
router.delete('/:id', requireRole('owner', 'manager'), deleteCustomer);

export default router;
