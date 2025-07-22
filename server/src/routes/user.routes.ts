// server/src/routes/user.routes.ts
import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all user routes
router.use(authenticateToken);

router.get('/summary', userController.getUserSummary);
router.get('/monthly-breakdown', userController.getMonthlyBreakdown);
router.get('/budget-analysis', userController.getBudgetAnalysis);
router.get('/insights', userController.getInsights);
router.delete('/account', userController.deleteAccount);

export { router as userRoutes };