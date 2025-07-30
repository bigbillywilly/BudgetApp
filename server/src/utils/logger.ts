// server/src/utils/logger.ts 

/// <reference types="node" />
import dotenv from 'dotenv';

const getTimestamp = (): string => {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
};

// Helper functions for different log types
export const logError = (message: string, error?: any): void => {
  console.error(`${getTimestamp()} ERROR: ${message}`, error?.stack || error || '');
};

export const logInfo = (message: string, meta?: any): void => {
  console.log(`${getTimestamp()} INFO: ${message}`, meta ? JSON.stringify(meta) : '');
};

export const logWarn = (message: string, meta?: any): void => {
  console.warn(`${getTimestamp()} WARN: ${message}`, meta ? JSON.stringify(meta) : '');
};

export const logDebug = (message: string, meta?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${getTimestamp()} DEBUG: ${message}`, meta ? JSON.stringify(meta) : '');
  }
};

export const logHttp = (message: string, meta?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${getTimestamp()} HTTP: ${message}`, meta ? JSON.stringify(meta) : '');
  }
};

// Define proper types for Express middleware
interface Request {
  method: string;
  url: string;
  ip: string;
  get(header: string): string | undefined;
}

interface Response {
  statusCode: number;
  on(event: string, callback: () => void): void;
}

type NextFunction = () => void;

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    logHttp(`${method} ${url}`, {
      ip,
      statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
};

// HTTP logger format (for compatibility)
export const httpLogger = (info: { timestamp?: string; level: string; message: string; meta?: any }): string => {
  const { timestamp, level, message, meta } = info;
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${meta ? JSON.stringify(meta) : ''}`;
};

// Default export (for compatibility)
const logger = {
  error: logError,
  info: logInfo,
  warn: logWarn,
  debug: logDebug,
  http: logHttp
};

export default logger;