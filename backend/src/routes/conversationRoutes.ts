import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as conversationController from '../controllers/conversationController.js';

const router = Router();

router.use(requireAuth);

router.get('/', conversationController.list);
router.post('/', conversationController.create);
router.get('/:id/messages', conversationController.getMessages);
router.patch('/:id', conversationController.rename);
router.patch('/:id/pin', conversationController.pin);
router.patch('/:id/archive', conversationController.archive);
router.delete('/:id', conversationController.remove);

export default router;
