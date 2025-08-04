// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../utils/jwt';
import { logError, logWarn } from '../utils/logger';

// Extend Request interface to include authenticated user context
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

// JWT authentication middleware with detailed error handling
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

    // Verify JWT and extract user payload
    const decoded = jwtService.verifyAccessToken(token);
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error: any) {
    logWarn('Authentication failed', { error: error.message, ip: req.ip });
    
    // Provide specific error codes for client token refresh logic
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

// Optional authentication for endpoints that enhance functionality with auth
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
        // Continue without user context if token is invalid
        logWarn('Optional auth failed', { error: error });
      }
    }

    next();
  } catch (error) {
    logError('Optional auth middleware error', error);
    next(); // Continue anyway for graceful degradation
  }
};

// Role-based access control middleware factory
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // TODO: Implement role checking when user roles are added to the system
    next();
  };
};

// Admin access control middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // TODO: Check if user is admin when role system is implemented
  return res.status(403).json({
    success: false,
    message: 'Admin access required'
  });
};

// Per-user rate limiting with sliding window algorithm
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const userId = req.user.userId;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or initialize user request history
    let requests = userRequests.get(userId) || [];
    
    // Remove expired requests from sliding window
    requests = requests.filter((timestamp: number) => timestamp > windowStart);
    
    if (requests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Track current request
    requests.push(now);
    userRequests.set(userId, requests);

    next();
  };
};

// Security headers middleware for OWASP compliance
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('X-Powered-By');
  
  // Apply security headers to prevent common attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};