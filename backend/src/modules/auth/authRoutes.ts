import { Router } from 'express';
import { login, getCurrentUser, getUsers, createUser, updateUser, deleteUser } from './authController';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireRole } from '../../middleware/rbac';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.get('/users', authenticate, requirePermission('users.view'), getUsers);
router.post('/users', authenticate, requirePermission('users.manage'), createUser);
router.put('/users/:id', authenticate, requirePermission('users.manage'), updateUser);
router.delete('/users/:id', authenticate, requirePermission('users.manage'), deleteUser);

export default router;
