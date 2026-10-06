import { Router } from 'express';
import {
  getDiagnostics,
  getDiagnosticById,
  createDiagnostic,
  getDtcCodeHistory
} from './diagnosticsController';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('diagnostics.view'), getDiagnostics);
router.get('/code-history/:code', requirePermission('diagnostics.view'), getDtcCodeHistory);
router.get('/:id', requirePermission('diagnostics.view'), getDiagnosticById);
router.post('/', requirePermission('diagnostics.create'), createDiagnostic);

export default router;
