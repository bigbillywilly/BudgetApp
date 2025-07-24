// server/src/utils/logger.ts - MINIMAL VERSION WITHOUT WINSTON
// Simple console-based logging without Winston

const getTimestamp = () => {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
};

// Helper functions for different log types
export const logError = (message: string, error?: any) => {
  console.error(`${getTimestamp()} ERROR: ${message}`, error?.stack || error || '');
};

export const logInfo = (message: string, meta?: any) => {
  console.log(`${getTimestamp()} INFO: ${message}`, meta ? JSON.stringify(meta) : '');
};

export const logWarn = (message: string, meta?: any) => {
  console.warn(`${getTimestamp()} WARN: ${message}`, meta ? JSON.stringify(meta) : '');
};

export const logDebug = (message: string, meta?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${getTimestamp()} DEBUG: ${message}`, meta ? JSON.stringify(meta) : '');
  }
};

export const logHttp = (message: string, meta?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${getTimestamp()} HTTP: ${message}`, meta ? JSON.stringify(meta) : '');
  }
};

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
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
export const httpLogger = (info: any) => {
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