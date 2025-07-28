// server/src/routes/transaction.routes.ts - REAL DATA VERSION
import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';
import { validate, transactionSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

console.log('💳 Loading REAL transaction routes with database integration...');

// Apply authentication to all transaction routes
router.use(authenticateToken);

// =============================================================================
// TRANSACTION CRUD OPERATIONS
// =============================================================================

// Get all transactions for authenticated user (with filtering and pagination)
router.get('/', transactionController.getTransactions);

// Get single transaction by ID for authenticated user
router.get('/:id', transactionController.getTransaction);

// Create new transaction for authenticated user
router.post('/', validate(transactionSchemas.createTransaction), transactionController.createTransaction);

// Update existing transaction for authenticated user
router.put('/:id', transactionController.updateTransaction);

// Delete transaction for authenticated user
router.delete('/:id', transactionController.deleteTransaction);

// =============================================================================
// TRANSACTION CATEGORIES
// =============================================================================

// Get all available transaction categories
router.get('/categories', transactionController.getCategories);

// =============================================================================
// ANALYTICS ENDPOINTS
// =============================================================================

// Get spending breakdown by category for date range
router.get('/analytics/spending-by-category', transactionController.getSpendingByCategory);

// Get monthly spending trends for authenticated user
router.get('/analytics/trends', transactionController.getMonthlyTrends);

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