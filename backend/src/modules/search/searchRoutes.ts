import { Router } from 'express';
import { globalSearch } from './searchController';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/global', globalSearch);
router.get('/', globalSearch);

export default router;
