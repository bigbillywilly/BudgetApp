// server/src/routes/auth.routes.ts - REAL DATA VERSION
import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validate, authSchemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';
import { authenticateToken } from '../middleware/auth';

const router = Router();

console.log('🔐 Loading REAL auth routes with database integration...');

// Apply rate limiting to all auth routes
router.use(authLimiter);

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

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

// =============================================================================
// PROTECTED ROUTES (Authentication required)
// =============================================================================

// Get user profile
router.get('/profile', authenticateToken, authController.getProfile);

// Update user profile
router.put('/profile', authenticateToken, authController.updateProfile);

// Logout user
router.post('/logout', authenticateToken, authController.logout);

// =============================================================================
// TEST/DEBUG ROUTES (Development only)
// =============================================================================

if (process.env.NODE_ENV === 'development') {
  // Test route to verify auth routes are working
  router.get('/test', (req, res) => {
    console.log('✅ Auth test route hit');
    res.json({ 
      success: true,
      message: 'Auth routes are working with REAL controllers!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  // Test protected route
  router.get('/test-protected', authenticateToken, (req, res) => {
    res.json({
      success: true,
      message: 'Protected route working!',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  });
}

console.log('✅ Real auth routes configured with database controllers');

export { router as authRoutes };