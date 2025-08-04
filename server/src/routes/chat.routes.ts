// server/src/routes/chat.routes.ts
import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { validate, chatSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { chatLimiter } from '../middleware/rateLimit';

const router = Router();

// All chat endpoints require authentication and rate limiting
router.use(authenticateToken);
router.use(chatLimiter);

// Send a chat message (validated input)
router.post('/message', validate(chatSchemas.sendMessage), chatController.sendMessage);

// Retrieve chat history for authenticated user
router.get('/history', chatController.getChatHistory);

// Get AI-driven financial insights from chat history
router.get('/insights', chatController.getInsights);

// Quick question endpoint for short AI queries
router.post('/quick-question', chatController.quickQuestion);

export { router as chatRoutes };