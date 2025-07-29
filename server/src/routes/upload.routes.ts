// server/src/routes/upload.routes.ts - REAL DATA VERSION
import { Router } from 'express';
import { uploadController, upload } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';

const router = Router();

console.log('📁 Loading REAL upload routes with database integration...');

// Apply authentication to all upload routes
router.use(authenticateToken);

// Apply upload rate limiting
router.use(uploadLimiter);

// =============================================================================
// CSV UPLOAD OPERATIONS
// =============================================================================

// Upload CSV file and process transactions
router.post('/csv', upload.single('csvFile'), uploadController.uploadCSV.bind(uploadController));

// Get upload history for authenticated user
router.get('/history', uploadController.getUploadHistory.bind(uploadController));

// Get transactions from specific upload for authenticated user
router.get('/:id/transactions', uploadController.getUploadTransactions.bind(uploadController));

// Delete upload and its transactions for authenticated user
router.delete('/:id', uploadController.deleteUpload.bind(uploadController));

// =============================================================================
// TEST/DEBUG ROUTES (Development only)
// =============================================================================

if (process.env.NODE_ENV === 'development') {
  // Test route to verify upload routes are working
  router.get('/test', (req, res) => {
    console.log('✅ Upload test route hit');
    res.json({ 
      success: true,
      message: 'Upload routes are working with REAL controllers!',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  });
}

console.log('✅ Real upload routes configured with database controllers');

export { router as uploadRoutes };