// server/src/routes/chat.routes.ts
import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { validate, chatSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { chatLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply authentication and rate limiting to all chat routes
router.use(authenticateToken);
router.use(chatLimiter);

router.post('/message', validate(chatSchemas.sendMessage), chatController.sendMessage);
router.get('/history', chatController.getChatHistory);
router.get('/insights', chatController.getInsights);
router.post('/quick-question', chatController.quickQuestion);

export { router as chatRoutes };