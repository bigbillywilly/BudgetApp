// server/src/routes/upload.routes.ts - REAL DATA VERSION
import { Router } from 'express';
import { uploadController, upload } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';

const router = Router();

console.log('Loading upload routes with database integration...');

// All upload routes require authentication and rate limiting
router.use(authenticateToken);
router.use(uploadLimiter);

// Upload CSV file and process transactions
router.post('/csv', upload.single('csvFile'), uploadController.uploadCSV.bind(uploadController));

// Get upload history for authenticated user
router.get('/history', uploadController.getUploadHistory.bind(uploadController));

// Get transactions from specific upload for authenticated user
router.get('/:id/transactions', uploadController.getUploadTransactions.bind(uploadController));

// Delete upload and its transactions for authenticated user
router.delete('/:id', uploadController.deleteUpload.bind(uploadController));

// Development-only test/debug route
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.json({ 
      success: true,
      message: 'Upload routes are working with real controllers',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  });
}

console.log('Upload routes configured with database controllers');

export { router as uploadRoutes };