// server/src/routes/index.ts - REAL DATA VERSION
import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { transactionRoutes } from './transaction.routes';
import { chatRoutes } from './chat.routes';
import { uploadRoutes } from './upload.routes';
import { financialRoutes } from './financial.routes';

const router = Router();

console.log('Loading routes with real database integration...');

// Health check endpoint for uptime and diagnostics
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Mount route modules for all major API domains
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);
router.use('/financial', financialRoutes);

// API documentation endpoint with endpoint map and rate limits
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'MoneyWise API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user account',
        'POST /api/auth/login': 'User authentication',
        'POST /api/auth/refresh': 'Refresh access token',
        'GET /api/auth/profile': 'Get user profile',
        'PUT /api/auth/profile': 'Update user profile'
      },
      users: {
        'GET /api/users/summary': 'Get user financial summary',
        'GET /api/users/monthly-breakdown': 'Get monthly breakdown',
        'GET /api/users/budget-analysis': 'Get budget analysis',
        'GET /api/users/insights': 'Get financial insights'
      },
      transactions: {
        'GET /api/transactions': 'List user transactions with filters',
        'POST /api/transactions': 'Create new transaction',
        'GET /api/transactions/:id': 'Get specific transaction',
        'PUT /api/transactions/:id': 'Update transaction',
        'DELETE /api/transactions/:id': 'Delete transaction',
        'GET /api/transactions/categories': 'Get transaction categories'
      },
      chat: {
        'POST /api/chat/message': 'Send message to AI advisor',
        'GET /api/chat/history': 'Get chat conversation history',
        'GET /api/chat/insights': 'Get AI-generated insights',
        'POST /api/chat/quick-question': 'Ask predefined questions'
      },
      upload: {
        'POST /api/upload/csv': 'Upload and process CSV file',
        'GET /api/upload/history': 'Get upload history',
        'GET /api/upload/:id/transactions': 'Get transactions from upload',
        'DELETE /api/upload/:id': 'Delete upload and transactions'
      },
      financial: {
        'GET /api/financial/current': 'Get current month data',
        'POST /api/financial/current': 'Update current month data',
        'GET /api/financial/historical': 'Get historical financial data'
      }
    },
    rateLimit: {
      general: '100 requests per 15 minutes',
      auth: '5 requests per 15 minutes',
      upload: '10 requests per hour',
      chat: '20 requests per minute'
    }
  });
});

// Catch-all 404 handler for undefined API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    suggestion: 'Check the API documentation at /api/docs',
    availableEndpoints: ['/api/auth/*', '/api/transactions/*', '/api/chat/*', '/api/upload/*'],
  });
});

export { router as apiRoutes };