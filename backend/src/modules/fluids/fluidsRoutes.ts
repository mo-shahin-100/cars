import { Router } from 'express';
import { getFluidRecords, createFluidRecord, getUpcomingMaintenance } from './fluidsController';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('fluids.view'), getFluidRecords);
router.get('/upcoming', requirePermission('fluids.view'), getUpcomingMaintenance);
router.post('/', requirePermission('fluids.create'), createFluidRecord);

export default router;
