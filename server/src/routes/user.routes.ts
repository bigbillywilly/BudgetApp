// server/src/routes/user.routes.ts - REAL DATA VERSION
import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

console.log('👤 Loading REAL user routes with database integration...');

// Apply authentication to all user routes
router.use(authenticateToken);

// =============================================================================
// USER DATA ENDPOINTS
// =============================================================================

// Get comprehensive user summary with financial stats
router.get('/summary', userController.getUserSummary);

// Get monthly financial breakdown by year
router.get('/monthly-breakdown', userController.getMonthlyBreakdown);

// Get detailed budget analysis for specific month/year
router.get('/budget-analysis', userController.getBudgetAnalysis);

// Get AI-generated financial insights and recommendations
router.get('/insights', userController.getInsights);

// =============================================================================
// ACCOUNT MANAGEMENT
// =============================================================================

// Delete user account and all associated data (destructive action)
router.delete('/account', userController.deleteAccount);

// =============================================================================
// TEST/DEBUG ROUTES (Development only)
// =============================================================================

if (process.env.NODE_ENV === 'development') {
  // Test route to verify user routes are working
  router.get('/test', (req, res) => {
    console.log('✅ User test route hit');
    res.json({ 
      success: true,
      message: 'User routes are working with REAL controllers!',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  });
}

console.log('✅ Real user routes configured with database controllers');

export { router as userRoutes };