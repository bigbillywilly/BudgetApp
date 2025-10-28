// server/src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import { apiRoutes } from './routes/index';
import { db } from './database/connection';
import { migrationRunner } from './database/migrationRunner';
import { logInfo, logError, logWarn } from './utils/logger';

// Extend Express types for request context
declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

class MoneyWiseApp {
  public app: Application;
  private port: number;
  private server: any;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '5000');
    console.log('Initializing MoneyWise App...');
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    console.log('MoneyWise App initialized');
  }

  // Database initialization and migration
  async initializeDatabase(): Promise<void> {
    try {
      logInfo('Database initialization skipped');
      logInfo('Connecting to database...');
      const connected = await db.testConnection();
      if (!connected) {
        throw new Error('Database connection failed');
      }
      logInfo('Database connected successfully');
      if (process.env.NODE_ENV !== 'test') {
        logInfo('Running database migrations...');
        await migrationRunner.runMigrations();
        logInfo('Migrations completed');
      }
    } catch (error) {
      logError('Database initialization failed', error);
      logWarn('Continuing without database for testing');
    }
  }

  // Middleware setup for security, CORS, logging, and rate limiting
  private setupMiddleware(): void {
    try {
      this.app.disable('x-powered-by');
      this.app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
      }));

      const corsOptions = {
        origin: this.getCorsOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      };
      this.app.use(cors(corsOptions));
      console.log('CORS configured for:', this.getCorsOrigins());

      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
      this.app.use(compression());

      if (process.env.NODE_ENV === 'development') {
        this.app.use(morgan('dev'));
      }

      // Attach unique request ID to each request
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        req.id = this.generateRequestId();
        res.setHeader('X-Request-ID', req.id);
        next();
      });

      // Rate limiting for API endpoints
      const rateLimit = require('express-rate-limit');
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      });
      this.app.use('/api', limiter);

      console.log('Middleware setup complete');
    } catch (error) {
      console.error('Middleware setup failed:', error);
      throw error;
    }
  }

  // Route setup for health, root, and API endpoints
  private setupRoutes(): void {
    try {
      this.app.get('/health', (req: Request, res: Response) => {
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.0'
        });
      });

      this.app.get('/', (req: Request, res: Response) => {
        res.json({
          message: 'MoneyWise API',
          version: '1.0.0',
          status: 'running',
          endpoints: {
            docs: '/api/docs',
            health: '/health',
            api: '/api'
          }
        });
      });

      // Debug middleware for API routes
      this.app.use('/api', (req, res, next) => {
        console.log(`API: ${req.method} ${req.path}`);
        next();
      });

      this.app.use('/api', apiRoutes);

      console.log('Routes setup complete');
    } catch (error) {
      console.error('Routes setup failed:', error);
      throw error;
    }
  }

  // Error handling for 404s, global errors, and process signals
  private setupErrorHandling(): void {
    try {
      this.app.use((req: Request, res: Response) => {
        res.status(404).json({
          error: 'Not Found',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          requestId: req.id,
          availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /api/health',
            'GET /api/test',
            'GET /api/docs',
            'GET /api/auth/test',
            'POST /api/auth/register',
            'POST /api/auth/login'
          ]
        });
      });

      this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
        const status = error.status || error.statusCode || 500;
        const message = process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : error.message;

        res.status(status).json({
          error: 'Server Error',
          message,
          requestId: req.id
        });
      });

      process.on('uncaughtException', (error: Error) => {
        logError('Uncaught Exception', error);
        this.shutdown();
      });

      process.on('unhandledRejection', (reason: any) => {
        logError('Unhandled Rejection', reason);
        this.shutdown();
      });

      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

      console.log('Error handling setup complete');
    } catch (error) {
      console.error('Error handling setup failed:', error);
      throw error;
    }
  }

  // CORS origin whitelist for production and development
  private getCorsOrigins(): string[] {
    if (process.env.NODE_ENV === 'production') {
      return [
        'https://budget-b2cyoznxt-willys-projects-a8ff841f.vercel.app/',
        process.env.FRONTEND_URL
      ].filter((origin): origin is string => typeof origin === 'string' && origin.length > 0);
    }
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
  }

  // Generate unique request ID for tracing
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Graceful shutdown for server and resources
  private async shutdown(): Promise<void> {
    logInfo('Shutting down server...');
    try {
      // await db.closeConnection();
      console.log('Database connections closed (skipped)');
      if (this.server) {
        this.server.close(() => {
          logInfo('Server closed');
          process.exit(0);
        });
        setTimeout(() => {
          logError('Forcing server close');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    } catch (error) {
      logError('Error during shutdown', error);
      process.exit(1);
    }
  }

  // Start server and initialize database
  async start(): Promise<void> {
    try {
      logInfo('Starting MoneyWise server...');
      await this.initializeDatabase();
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        logInfo(`Server started on port ${this.port}`, {
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version
        });
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logError(`Port ${this.port} is already in use`);
          process.exit(1);
        } else {
          logError('Server error', error);
          process.exit(1);
        }
      });

    } catch (error) {
      logError('Failed to start server', error);
      process.exit(1);
    }
  }

  // Get Express app instance
  getApp(): Application {
    return this.app;
  }

  // Close server (for testing)
  async close(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

export default MoneyWiseApp;