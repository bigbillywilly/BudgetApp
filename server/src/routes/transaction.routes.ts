// server/src/routes/transaction.routes.ts - FIXED ROUTE ORDER
import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';
import { validate, transactionSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

console.log('💳 Loading REAL transaction routes with database integration...');

// Apply authentication to all transaction routes
router.use(authenticateToken);

// =============================================================================
// IMPORTANT: SPECIFIC ROUTES MUST COME BEFORE PARAMETERIZED ROUTES
// Put all static routes BEFORE /:id to avoid route conflicts
// =============================================================================

// STATIC ROUTES FIRST (these must come before /:id)
router.get('/categories', transactionController.getCategories);
router.get('/analytics/spending-by-category', transactionController.getSpendingByCategory);
router.get('/analytics/trends', transactionController.getMonthlyTrends);

// GENERAL TRANSACTION ROUTES
router.get('/', transactionController.getTransactions);
router.post('/', validate(transactionSchemas.createTransaction), transactionController.createTransaction);

// PARAMETERIZED ROUTES LAST (so they don't catch static routes)
router.get('/:id', transactionController.getTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

// =============================================================================
// TEST/DEBUG ROUTES (Development only)
// =============================================================================

if (process.env.NODE_ENV === 'development') {
  // Test route to verify transaction routes are working
  router.get('/test', (req, res) => {
    console.log('✅ Transaction test route hit');
    res.json({ 
      success: true,
      message: 'Transaction routes are working with REAL controllers!',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  });
}

console.log('✅ Real transaction routes configured with database controllers');

export { router as transactionRoutes };