import { Router } from 'express';
import {
  getParts,
  getPartById,
  createPart,
  updatePart,
  recordStockMovement,
  deletePart,
  generatePartCode,
  scanBarcodeAction,
  getStockMovementsReport
} from './inventoryController';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('inventory.view'), getParts);
router.get('/generate-code', requirePermission('inventory.view'), generatePartCode);
router.get('/movements/report', requirePermission('inventory.view'), getStockMovementsReport);
router.get('/:id', requirePermission('inventory.view'), getPartById);
router.post('/', requirePermission('inventory.manage'), createPart);
router.post('/barcode-scan', requirePermission('inventory.manage'), scanBarcodeAction);
router.put('/:id', requirePermission('inventory.manage'), updatePart);
router.post('/movements', requirePermission('inventory.manage'), recordStockMovement);
router.delete('/:id', requireRole('owner', 'manager'), deletePart);

export default router;
