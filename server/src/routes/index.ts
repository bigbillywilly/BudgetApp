// server/src/routes/index.ts
import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { transactionRoutes } from './transaction.routes';
import { chatRoutes } from './chat.routes';
import { uploadRoutes } from './upload.routes';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MoneyWise API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', authenticateToken, uploadRoutes);


// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'MoneyWise API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/refresh': 'Refresh access token',
        'GET /api/auth/profile': 'Get user profile (protected)',
        'PUT /api/auth/profile': 'Update user profile (protected)',
        'POST /api/auth/logout': 'Logout user (protected)'
      },
      users: {
        'GET /api/users/summary': 'Get user financial summary',
        'GET /api/users/monthly-breakdown': 'Get monthly breakdown',
        'GET /api/users/budget-analysis': 'Get budget analysis',
        'GET /api/users/insights': 'Get financial insights'
      },
      transactions: {
        'GET /api/transactions': 'Get transactions with filters',
        'POST /api/transactions': 'Create new transaction',
        'GET /api/transactions/:id': 'Get specific transaction',
        'PUT /api/transactions/:id': 'Update transaction',
        'DELETE /api/transactions/:id': 'Delete transaction',
        'GET /api/transactions/categories': 'Get available categories',
        'GET /api/transactions/analytics/spending-by-category': 'Get spending by category',
        'GET /api/transactions/analytics/trends': 'Get monthly trends'
      },
      chat: {
        'POST /api/chat/message': 'Send message to AI advisor',
        'GET /api/chat/history': 'Get chat history',
        'GET /api/chat/insights': 'Get AI-generated insights',
        'POST /api/chat/quick-question': 'Ask predefined quick question'
      },
      financial: {
        'GET /api/financial/current': 'Get current month data',
        'POST /api/financial/current': 'Update current month data',
        'GET /api/financial/historical': 'Get historical data'
      },
      upload: {
        'POST /api/upload/csv': 'Upload and process CSV file'
      }
    },
    authentication: 'Bearer token required for protected endpoints',
    rateLimit: 'Rate limiting applied to auth and chat endpoints'
  });
});

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: '/api/docs'
  });
});

export { router as apiRoutes };