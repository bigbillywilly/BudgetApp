import { Request, Response, NextFunction } from 'express';
import { isDevelopment } from '../config/environment';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

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
    ...(isDevelopment && { stack: err.stack }),
  };

  // Log error
  console.error(`Error ${statusCode}: ${message}`);
  if (isDevelopment) {
    console.error(err.stack);
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
  });
};

// Utility function to create custom errors
export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};