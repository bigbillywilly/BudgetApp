// server/src/routes/transaction.routes.ts
import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';
import { validate, transactionSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all transaction routes
router.use(authenticateToken);

// Transaction CRUD
router.get('/', transactionController.getTransactions);
router.get('/categories', transactionController.getCategories);
router.get('/:id', transactionController.getTransaction);
router.post('/', validate(transactionSchemas.createTransaction), transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

// Analytics endpoints
router.get('/analytics/spending-by-category', transactionController.getSpendingByCategory);
router.get('/analytics/trends', transactionController.getMonthlyTrends);

export { router as transactionRoutes };