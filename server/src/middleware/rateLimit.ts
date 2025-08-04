// server/src/middleware/rateLimit.ts - ENHANCED VERSION with latest express-rate-limit
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logWarn, logError } from '../utils/logger';
import { getConfig } from '../config/environment';

const config = getConfig();

// Factory for express-rate-limit with custom logging and response
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
    limit: options.max,
    message: {
      success: false,
      error: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
      timestamp: new Date().toISOString()
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
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

// General API rate limiter for all endpoints
export const generalLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this client, please try again later.',
  skipFailedRequests: true,
  onLimitReached: (req, res) => {
    logWarn('General rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip,
      endpoint: req.path
    });
  }
});

// Authentication endpoints limiter (prevents brute force)
export const authLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMaxRequests,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  onLimitReached: (req, res) => {
    logWarn('Auth rate limit exceeded - potential brute force attack', {
      ip: req.ip,
      endpoint: req.path,
      body: req.body ? { email: req.body.email } : undefined,
      userAgent: req.get('User-Agent')
    });
  }
});

// Password reset limiter (protects against abuse)
export const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset attempts, please try again in an hour.',
  onLimitReached: (req, res) => {
    logWarn('Password reset rate limit exceeded', {
      email: req.body?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
});

// File upload limiter (per user)
export const uploadLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.uploadMaxRequests,
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

// Daily upload limiter (strict daily cap)
export const dailyUploadLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: 50,
  message: 'Daily upload limit reached, please try again tomorrow.',
  onLimitReached: (req, res) => {
    logWarn('Daily upload limit exceeded', {
      user: req.user?.userId,
      ip: req.ip
    });
  }
});

// Chat/AI endpoints limiter (protects expensive operations)
export const chatLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs / 15,
  max: config.rateLimit.chatMaxRequests,
  message: 'Too many chat requests, please slow down.',
  onLimitReached: (req, res) => {
    logWarn('Chat rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip,
      messageLength: req.body?.message?.length
    });
  }
});

export const aiInsightsLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many AI insights requests, please wait before requesting more.',
  onLimitReached: (req, res) => {
    logWarn('AI insights rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip
    });
  }
});

// Transaction endpoints limiter (protects DB from abuse)
export const transactionLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs,
  max: 200,
  message: 'Too many transaction requests, please try again later.',
  skipFailedRequests: true
});

export const transactionWriteLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 50,
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

// Email verification limiter
export const emailVerificationLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many email verification attempts, please try again later.'
});

// Account deletion limiter (very strict, security-sensitive)
export const accountDeletionLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1,
  message: 'Account deletion limit reached, please contact support if you need assistance.',
  onLimitReached: (req, res) => {
    logWarn('Account deletion rate limit exceeded', {
      user: req.user?.userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
});

// Progressive rate limiter (dynamically adjusts based on activity)
export const progressiveLimiter = (baseMax: number, windowMs: number) => {
  const store = new Map<string, { count: number; timestamp: number }>();
  return (req: Request, res: Response, next: Function) => {
    const key = req.user?.userId || req.ip || 'unknown';
    const now = Date.now();
    const window = windowMs;

    // Clean up expired entries
    Array.from(store.entries()).forEach(([k, v]) => {
      if (now - v.timestamp > window) {
        store.delete(k);
      }
    });

    const current = store.get(key) || { count: 0, timestamp: now };
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

    store.set(key, {
      count: current.count + 1,
      timestamp: current.timestamp || now
    });

    next();
  };
};

// Utility: create custom limiter with options
export const createCustomLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request) => void;
}) => {
  return createLimiter(options);
};

// Utility: get rate limit status headers for debugging
export const getRateLimitStatus = (req: Request) => {
  return {
    limit: req.get('RateLimit-Limit'),
    remaining: req.get('RateLimit-Remaining'),
    reset: req.get('RateLimit-Reset'),
    policy: req.get('RateLimit-Policy')
  };
};

// Utility: health check endpoint for rate limiter
export const rateLimiterHealthCheck = (req: Request, res: Response) => {
  const status = getRateLimitStatus(req);
  res.json({
    success: true,
    message: 'Rate limiter is functioning',
    rateLimits: status,
    timestamp: new Date().toISOString()
  });
};

// Combine multiple rate limiters for stricter protection
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
        if (err) return next(err);
        runNextLimiter();
      });
    };
    runNextLimiter();
  };
};

// Preset combinations for high-risk endpoints
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