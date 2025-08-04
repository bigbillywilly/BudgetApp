// server/src/routes/auth.routes.ts - REAL DATA VERSION
import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validate, authSchemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';
import { authenticateToken } from '../middleware/auth';

const router = Router();

console.log('Loading auth routes with database integration...');

// Apply rate limiting to all authentication endpoints
router.use(authLimiter);

// Public authentication endpoints
// Register new user
router.post('/register', validate(authSchemas.register), authController.register);

// Login user
router.post('/login', validate(authSchemas.login), authController.login);

// Refresh access token
router.post('/refresh', authController.refreshToken);

// Verify email address
router.post('/verify-email', authController.verifyEmail);

// Request password reset
router.post('/forgot-password', validate(authSchemas.forgotPassword), authController.forgotPassword);

// Reset password with token
router.post('/reset-password', validate(authSchemas.resetPassword), authController.resetPassword);

// Protected endpoints (JWT required)
// Get user profile
router.get('/profile', authenticateToken, authController.getProfile);

// Update user profile
router.put('/profile', authenticateToken, authController.updateProfile);

// Logout user
router.post('/logout', authenticateToken, authController.logout);

// Development-only test/debug endpoints
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'Auth routes are working with real controllers',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  router.get('/test-protected', authenticateToken, (req, res) => {
    res.json({
      success: true,
      message: 'Protected route working',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  });
}

console.log('Auth routes configured with database controllers');

export { router as authRoutes };