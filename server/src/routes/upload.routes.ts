// server/src/routes/upload.routes.ts
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

// Get transactions from specific upload - FIXED ROUTE PATTERN
router.get('/:uploadId/transactions', uploadController.getUploadTransactions.bind(uploadController));

// Delete upload and its transactions - FIXED ROUTE PATTERN  
router.delete('/:uploadId', uploadController.deleteUpload.bind(uploadController));

export { router as uploadRoutes };