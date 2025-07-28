// server/src/routes/upload.routes.ts - UPDATED WITH ANALYSIS ENDPOINT
import { Router } from 'express';
import { uploadController, upload } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply authentication to all upload routes
router.use(authenticateToken);

// Apply upload rate limiting
router.use(uploadLimiter);

// CSV upload endpoint with file validation
router.post('/csv', upload.single('csvFile'), uploadController.uploadCSV.bind(uploadController));

// Upload history
router.get('/history', uploadController.getUploadHistory.bind(uploadController));

// Get transactions from specific upload
router.get('/:id/transactions', uploadController.getUploadTransactions.bind(uploadController));

// Get detailed analysis for specific upload - NEW ENDPOINT
router.get('/:id/analysis', uploadController.getUploadAnalysis.bind(uploadController));

// Delete upload and its transactions
router.delete('/:id', uploadController.deleteUpload.bind(uploadController));

export { router as uploadRoutes };