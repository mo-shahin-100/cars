import { Router } from 'express';
import {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  addTaskToWorkOrder,
  updateTask,
  deleteTask,
  updateTaskStatus,
  consumePartForWorkOrder,
  removeUsedPart,
  quickAddVisitItem,
  deleteWorkOrder
} from './workOrdersController';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('work_orders.view'), getWorkOrders);
router.get('/:id', requirePermission('work_orders.view'), getWorkOrderById);
router.post('/', requirePermission('work_orders.create'), createWorkOrder);
router.post('/tasks', requirePermission('work_orders.update'), addTaskToWorkOrder);
router.put('/tasks/:id', requirePermission('work_orders.update'), updateTask);
router.delete('/tasks/:id', requirePermission('work_orders.update'), deleteTask);
router.patch('/tasks/:id/status', requirePermission('tasks.update'), updateTaskStatus);
router.post('/tasks/consume-part', requirePermission('parts.consume'), consumePartForWorkOrder);
router.delete('/used-parts/:id', requirePermission('parts.consume'), removeUsedPart);
router.post('/quick-item', requirePermission('work_orders.update'), quickAddVisitItem);
router.delete('/:id', requireRole('owner', 'manager'), deleteWorkOrder);

export default router;

