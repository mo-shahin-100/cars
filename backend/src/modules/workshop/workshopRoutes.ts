import { Router } from 'express';
import { getWorkshopProfile, updateWorkshopProfile } from './workshopController';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', getWorkshopProfile);
router.put('/', requireRole('owner', 'manager'), updateWorkshopProfile);

export default router;
