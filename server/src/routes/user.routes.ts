// server/src/routes/user.routes.ts - REAL DATA VERSION
import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

console.log('Loading user routes with database integration...');

// All user routes require authentication
router.use(authenticateToken);

// User analytics and summary endpoints
router.get('/summary', userController.getUserSummary);
router.get('/monthly-breakdown', userController.getMonthlyBreakdown);
router.get('/budget-analysis', userController.getBudgetAnalysis);
router.get('/insights', userController.getInsights);

// Account management (destructive action)
router.delete('/account', userController.deleteAccount);

// Development-only test/debug route
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'User routes are working with real controllers',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  });
}

console.log('Real user routes configured with database controllers');

export { router as userRoutes };