import { Router } from 'express';
import { pullSyncEvents, pushSyncQueue } from './syncController';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/pull', pullSyncEvents);
router.post('/push', pushSyncQueue);

export default router;
