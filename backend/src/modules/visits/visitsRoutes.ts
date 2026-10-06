import { Router } from 'express';
import { getVisits, getVisitById, createVisit, updateVisitStatus, deleteVisit, getVisitWhatsAppReady } from './visitsController';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('visits.view'), getVisits);
router.get('/:id', requirePermission('visits.view'), getVisitById);
router.get('/:id/whatsapp-ready', requirePermission('visits.view'), getVisitWhatsAppReady);
router.post('/', requirePermission('visits.create'), createVisit);
router.patch('/:id/status', requirePermission('visits.update'), updateVisitStatus);
router.delete('/:id', requireRole('owner', 'manager'), deleteVisit);

export default router;
