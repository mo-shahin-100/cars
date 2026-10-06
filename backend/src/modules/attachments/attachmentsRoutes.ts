import { Router } from 'express';
import { uploadAttachment, getAttachments } from './attachmentsController';
import { authenticate } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', getAttachments);
router.post('/upload', upload.single('file'), uploadAttachment);

export default router;
