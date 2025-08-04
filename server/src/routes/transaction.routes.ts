// server/src/routes/transaction.routes.ts
import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';
import { validate, transactionSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

console.log('Loading transaction routes with database integration...');

// All transaction routes require authentication
router.use(authenticateToken);

// Static routes must precede parameterized routes to avoid conflicts
router.get('/categories', transactionController.getCategories);
router.get('/analytics/spending-by-category', transactionController.getSpendingByCategory);
router.get('/analytics/trends', transactionController.getMonthlyTrends);

// General transaction CRUD
router.get('/', transactionController.getTransactions);
router.post('/', validate(transactionSchemas.createTransaction), transactionController.createTransaction);

// Parameterized routes for transaction-specific operations
router.get('/:id', transactionController.getTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

// Development-only test/debug route
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'Transaction routes are working with real controllers',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  });
}

console.log('Real transaction routes configured with database controllers');

export { router as transactionRoutes };