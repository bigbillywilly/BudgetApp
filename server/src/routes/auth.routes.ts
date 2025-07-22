// server/src/routes/auth.routes.ts
import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validate, authSchemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Public routes
router.post('/register', validate(authSchemas.register), authController.register);
router.post('/login', validate(authSchemas.login), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', validate(authSchemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(authSchemas.resetPassword), authController.resetPassword);

// Protected routes (these will be imported into main routes with auth middleware)
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/logout', authController.logout);

export { router as authRoutes };