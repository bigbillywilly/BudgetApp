import { Request, Response, NextFunction } from 'express';
import { isDevelopment } from '../config/environment';
import { logError } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Global error handler with environment-aware stack trace exposure
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { statusCode = 500, message } = err;

  const errorResponse = {
    status: 'error',
    statusCode,
    message,
    ...(isDevelopment() && { stack: err.stack }),
  };

  // Use structured logging instead of console for production monitoring
  logError(
    `HTTP ${statusCode}: ${message}`,
    {
      statusCode,
      message,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...(isDevelopment() && { stack: err.stack }),
    }
  );

  res.status(statusCode).json(errorResponse);
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response): void => {
  logError(`Route not found: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
  });
};

// Factory function for operational errors with consistent structure
export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// Async error wrapper to eliminate try-catch boilerplate in controllers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error formatter for client-friendly responses
export const handleValidationError = (validationErrors: any[]): AppError => {
  const messages = validationErrors.map((err) => err.message).join(', ');
  return createError(`Validation failed: ${messages}`, 400);
};

// Database error classifier for proper HTTP status mapping
export const handleDatabaseError = (error: any): AppError => {
  if (error.code === '23505') {
    // PostgreSQL unique violation
    return createError('Resource already exists', 409);
  } else if (error.code === '23503') {
    // Foreign key violation
    return createError('Referenced resource not found', 400);
  } else if (error.code === '23502') {
    // Not null violation
    return createError('Required field missing', 400);
  }

  return createError('Database operation failed', 500);
};