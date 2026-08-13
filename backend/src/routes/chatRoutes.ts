import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as chatController from '../controllers/chatController.js';
import { aiChatLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(requireAuth);
router.post('/', aiChatLimiter, chatController.streamChat);
router.get('/models', chatController.listModels);

export default router;
