// server/src/utils/logger.ts 

/// <reference types="node" />
import dotenv from 'dotenv';

// Timestamp utility for log entries
const getTimestamp = (): string => {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
};

// Error logging with stack trace
export const logError = (message: string, error?: any): void => {
  console.error(`${getTimestamp()} ERROR: ${message}`, error?.stack || error || '');
};

// Info logging for general events
export const logInfo = (message: string, meta?: any): void => {
  console.log(`${getTimestamp()} INFO: ${message}`, meta ? JSON.stringify(meta) : '');
};

// Warning logging for non-critical issues
export const logWarn = (message: string, meta?: any): void => {
  console.warn(`${getTimestamp()} WARN: ${message}`, meta ? JSON.stringify(meta) : '');
};

// Debug logging (development only)
export const logDebug = (message: string, meta?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${getTimestamp()} DEBUG: ${message}`, meta ? JSON.stringify(meta) : '');
  }
};

// HTTP request/response logging (development only)
export const logHttp = (message: string, meta?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${getTimestamp()} HTTP: ${message}`, meta ? JSON.stringify(meta) : '');
  }
};

// Express middleware types
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

// Express middleware for request logging
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

// HTTP logger format for compatibility with logging libraries
export const httpLogger = (info: { timestamp?: string; level: string; message: string; meta?: any }): string => {
  const { timestamp, level, message, meta } = info;
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${meta ? JSON.stringify(meta) : ''}`;
};

// Logger object for compatibility with external libraries
const logger = {
  error: logError,
  info: logInfo,
  warn: logWarn,
  debug: logDebug,
  http: logHttp
};

export default logger;