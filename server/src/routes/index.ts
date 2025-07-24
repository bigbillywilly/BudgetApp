// server/src/routes/index.ts
import { Router } from 'express';
// import { authRoutes } from './auth.routes';          // COMMENTED OUT
// import { userRoutes } from './user.routes';          // COMMENTED OUT  
// import { transactionRoutes } from './transaction.routes'; // COMMENTED OUT
// import { chatRoutes } from './chat.routes';          // COMMENTED OUT
// import { uploadRoutes } from './upload.routes';      // COMMENTED OUT
// import { financialRoutes } from './financial.routes'; // COMMENTED OUT

const router = Router();

// Health check only
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Comment out ALL route mounting
// router.use('/auth', authRoutes);           // COMMENTED OUT
// router.use('/users', userRoutes);          // COMMENTED OUT
// router.use('/transactions', transactionRoutes); // COMMENTED OUT
// router.use('/chat', chatRoutes);           // COMMENTED OUT
// router.use('/upload', uploadRoutes);       // COMMENTED OUT
// router.use('/financial', financialRoutes); // COMMENTED OUT

// Comment out all the other routes too (docs, 404 handler, etc.)
export { router as apiRoutes };