import { Router } from 'express';
import {
  getDashboardStats,
  getFinancialReport,
  getMechanicsProductivity
} from './reportsController';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/financial', requirePermission('reports.financial'), getFinancialReport);
router.get('/mechanics-productivity', requirePermission('reports.manage'), getMechanicsProductivity);

export default router;
