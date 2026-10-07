import { Router } from 'express';
import {
  getVehicles,
  getVehicleById,
  getVehicleTimeline,
  createVehicle,
  updateVehicle,
  updateMaintenanceSchedule,
  getVehicleWhatsAppMaintenance,
  transferOwnership,
  deleteVehicle
} from './vehiclesController';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('vehicles.view'), getVehicles);
router.get('/:id', requirePermission('vehicles.view'), getVehicleById);
router.get('/:id/whatsapp-maintenance', requirePermission('vehicles.view'), getVehicleWhatsAppMaintenance);
router.get('/:id/timeline', requirePermission('vehicles.view'), getVehicleTimeline);
router.post('/', requirePermission('vehicles.create'), createVehicle);
router.put('/:id', requirePermission('vehicles.update'), updateVehicle);
router.put('/:id/maintenance-schedule', requirePermission('vehicles.update'), updateMaintenanceSchedule);
router.post('/:id/transfer-ownership', requirePermission('vehicles.update'), transferOwnership);
router.delete('/:id', requireRole('owner', 'manager'), deleteVehicle);

export default router;
