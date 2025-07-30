// server/src/middleware/rateLimit.ts - ENHANCED VERSION with latest express-rate-limit
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logWarn, logError } from '../utils/logger';
import { getConfig } from '../config/environment';

const config = getConfig();

// =============================================================================
// RATE LIMITER CONFIGURATIONS
// =============================================================================

// Base rate limiter configuration
const createLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max, // Updated from 'max' to 'limit'
    message: {
      success: false,
      error: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
      timestamp: new Date().toISOString()
    },
    standardHeaders: 'draft-7', // Updated to use latest standard
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Use user ID if authenticated, otherwise fall back to IP using built-in helper
      const userId = req.user?.userId;
      if (userId) return userId;
      
      // Use the built-in IP helper for safe IPv4/IPv6 handling
      return req.ip || 'unknown';
    }),
    handler: (req: Request, res: Response) => {
      const identifier = req.user?.userId || req.ip;
      logWarn('Rate limit exceeded', {
        identifier,
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      if (options.onLimitReached) {
        options.onLimitReached(req, res);
      }

      res.status(429).json({
        success: false,
        error: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000),
        timestamp: new Date().toISOString(),
        endpoint: req.path
      });
    }
  });
};

// =============================================================================
// GENERAL API RATE LIMITING
// =============================================================================

export const generalLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.maxRequests, // 100 requests per window
  message: 'Too many requests from this client, please try again later.',
  skipFailedRequests: true, // Don't count failed requests
  onLimitReached: (req, res) => {
    logWarn('General rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip,
      endpoint: req.path
    });
  }
});

// =============================================================================
// AUTHENTICATION RATE LIMITING (Stricter)
// =============================================================================

export const authLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.authMaxRequests, // 5 auth attempts per window
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req: Request) => {
    // For auth, always use IP with built-in helper for safe handling
    return req.ip || 'unknown';
  },
  onLimitReached: (req, res) => {
    logWarn('Auth rate limit exceeded - potential brute force attack', {
      ip: req.ip,
      endpoint: req.path,
      body: req.body ? { email: req.body.email } : undefined,
      userAgent: req.get('User-Agent')
    });
  }
});

// Stricter limiter for password reset attempts
export const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again in an hour.',
  keyGenerator: (req: Request) => {
    // Use email + IP for password reset limiting
    const email = req.body?.email;
    const ip = req.ip || 'unknown';
    return email ? `${email}-${ip}` : ip;
  },
  onLimitReached: (req, res) => {
    logWarn('Password reset rate limit exceeded', {
      email: req.body?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
});

// =============================================================================
// FILE UPLOAD RATE LIMITING
// =============================================================================

export const uploadLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.uploadMaxRequests, // 10 uploads per window
  message: 'Too many file uploads, please try again later.',
  onLimitReached: (req, res) => {
    logWarn('Upload rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip,
      fileSize: req.file?.size,
      fileName: req.file?.originalname
    });
  }
});

// Strict daily upload limiter
export const dailyUploadLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // 50 uploads per day per user
  message: 'Daily upload limit reached, please try again tomorrow.',
  keyGenerator: (req: Request) => {
    // Always use user ID for daily limits
    return req.user?.userId || req.ip || 'unknown';
  },
  onLimitReached: (req, res) => {
    logWarn('Daily upload limit exceeded', {
      user: req.user?.userId,
      ip: req.ip
    });
  }
});

// =============================================================================
// AI/CHAT RATE LIMITING
// =============================================================================

export const chatLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs / 15, // 1 minute
  max: config.rateLimit.chatMaxRequests, // 20 messages per minute
  message: 'Too many chat requests, please slow down.',
  onLimitReached: (req, res) => {
    logWarn('Chat rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip,
      messageLength: req.body?.message?.length
    });
  }
});

// Stricter limiter for AI insights (more expensive operations)
export const aiInsightsLimiter = createLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 insights requests per 5 minutes
  message: 'Too many AI insights requests, please wait before requesting more.',
  onLimitReached: (req, res) => {
    logWarn('AI insights rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip
    });
  }
});

// =============================================================================
// TRANSACTION RATE LIMITING
// =============================================================================

export const transactionLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: 200, // 200 transaction operations per window
  message: 'Too many transaction requests, please try again later.',
  skipFailedRequests: true
});

// Stricter limiter for transaction creation/updates
export const transactionWriteLimiter = createLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 write operations per 5 minutes
  message: 'Too many transaction modifications, please slow down.',
  onLimitReached: (req, res) => {
    logWarn('Transaction write rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip,
      operation: req.method,
      endpoint: req.path
    });
  }
});

// =============================================================================
// SPECIALIZED RATE LIMITERS
// =============================================================================

// Email verification limiter
export const emailVerificationLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 verification attempts per window
  message: 'Too many email verification attempts, please try again later.',
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  }
});

// Account deletion limiter (very strict)
export const accountDeletionLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1, // Only 1 deletion attempt per day
  message: 'Account deletion limit reached, please contact support if you need assistance.',
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
  onLimitReached: (req, res) => {
    logWarn('Account deletion rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
});

// =============================================================================
// ADVANCED RATE LIMITERS
// =============================================================================

// Progressive rate limiter (gets stricter with more requests)
export const progressiveLimiter = (baseMax: number, windowMs: number) => {
  const store = new Map<string, { count: number; timestamp: number }>();
  
  return (req: Request, res: Response, next: Function) => {
    const key = req.user?.userId || req.ip || 'unknown';
    const now = Date.now();
    const window = windowMs;
    
    // Clean old entries
    Array.from(store.entries()).forEach(([k, v]) => {
      if (now - v.timestamp > window) {
        store.delete(k);
      }
    });
    
    const current = store.get(key) || { count: 0, timestamp: now };
    
    // Progressive multiplier based on recent activity
    const multiplier = Math.min(1 + (current.count / baseMax), 3);
    const adjustedMax = Math.floor(baseMax / multiplier);
    
    if (current.count >= adjustedMax) {
      logWarn('Progressive rate limit exceeded', {
        key,
        count: current.count,
        adjustedMax,
        multiplier,
        endpoint: req.path
      });
      
      return res.status(429).json({
        success: false,
        error: 'Request limit exceeded. Rate limit increases with activity.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Update counter
    store.set(key, {
      count: current.count + 1,
      timestamp: current.timestamp || now
    });
    
    next();
  };
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Create custom rate limiter with specific options
export const createCustomLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request) => void;
}) => {
  return createLimiter(options);
};

// Get rate limit status for debugging
export const getRateLimitStatus = (req: Request) => {
  const rateLimitHeaders = {
    limit: req.get('RateLimit-Limit'),
    remaining: req.get('RateLimit-Remaining'),
    reset: req.get('RateLimit-Reset'),
    policy: req.get('RateLimit-Policy')
  };
  
  return rateLimitHeaders;
};

// Rate limiter health check
export const rateLimiterHealthCheck = (req: Request, res: Response) => {
  const status = getRateLimitStatus(req);
  
  res.json({
    success: true,
    message: 'Rate limiter is functioning',
    rateLimits: status,
    timestamp: new Date().toISOString()
  });
};

// =============================================================================
// COMBINED RATE LIMITERS FOR ROUTES
// =============================================================================

// Combine multiple rate limiters
export const combineRateLimiters = (...limiters: any[]) => {
  return (req: Request, res: Response, next: Function) => {
    let currentIndex = 0;
    
    const runNextLimiter = () => {
      if (currentIndex >= limiters.length) {
        return next();
      }
      
      const limiter = limiters[currentIndex];
      currentIndex++;
      
      limiter(req, res, (err?: any) => {
        if (err) {
          return next(err);
        }
        runNextLimiter();
      });
    };
    
    runNextLimiter();
  };
};

// Export preset combinations
export const strictAuthLimiter = combineRateLimiters(
  generalLimiter,
  authLimiter
);

export const strictUploadLimiter = combineRateLimiters(
  generalLimiter,
  uploadLimiter,
  dailyUploadLimiter
);

export const strictChatLimiter = combineRateLimiters(
  generalLimiter,
  chatLimiter
);

console.log('✅ Enhanced rate limiters configured with user-specific limiting');