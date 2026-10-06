import { Router } from 'express';
import { createHotBackup, listBackups, resetDemoData } from './backupController';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

// Only Owner can create or view backups or reset demo data
router.get('/list', requireRole('owner'), listBackups);
router.post('/create', requireRole('owner'), createHotBackup);
router.post('/reset-data', requireRole('owner'), resetDemoData);

export default router;
