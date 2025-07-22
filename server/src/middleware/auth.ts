// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../utils/jwt';
import { logError, logWarn } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

// Authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify the token
    const decoded = jwtService.verifyAccessToken(token);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error: any) {
    logWarn('Authentication failed', { error: error.message, ip: req.ip });
    
    if (error.message === 'Access token expired') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.message === 'Invalid access token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token',
        code: 'TOKEN_INVALID'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional authentication middleware (for endpoints that work with or without auth)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwtService.verifyAccessToken(token);
        req.user = {
          userId: decoded.userId,
          email: decoded.email
        };
      } catch (error) {
        // Continue without user info if token is invalid
        logWarn('Optional auth failed', { error: error });
      }
    }

    next();
  } catch (error) {
    logError('Optional auth middleware error', error);
    next(); // Continue anyway
  }
};

// Role-based access control (for future use)
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // TODO: Implement role checking when user roles are added to the system
    // For now, all authenticated users have access
    next();
  };
};

// Admin access middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // TODO: Check if user is admin when role system is implemented
  // For now, deny access to admin routes
  return res.status(403).json({
    success: false,
    message: 'Admin access required'
  });
};

// Rate limiting per user
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(); // Skip rate limiting for non-authenticated requests
    }

    const userId = req.user.userId;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create user request history
    let requests = userRequests.get(userId) || [];
    
    // Remove old requests outside the window
    requests = requests.filter((timestamp: number) => timestamp > windowStart);
    
    // Check if user has exceeded the limit
    if (requests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    requests.push(now);
    userRequests.set(userId, requests);

    next();
  };
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};