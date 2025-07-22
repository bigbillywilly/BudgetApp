// server/src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import routes and utilities
import { apiRoutes } from './routes/index';
import { db } from './database/connection';
import { migrationRunner } from './database/migrationrunner';
import { logInfo, logError, logWarn } from './utils/logger';

// Extend Express types
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
    
    // Initialize in correct order
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  // Database initialization
  async initializeDatabase(): Promise<void> {
    try {
      logInfo('Connecting to database...');
      
      const connected = await db.testConnection();
      if (!connected) {
        throw new Error('Database connection failed');
      }

      logInfo('Database connected successfully');

      // Run migrations
      if (process.env.NODE_ENV !== 'test') {
        logInfo('Running database migrations...');
        await migrationRunner.runMigrations();
        logInfo('Migrations completed');
      }

    } catch (error) {
      logError('Database initialization failed', error);
      process.exit(1);
    }
  }

  // Setup all middleware
  private setupMiddleware(): void {
    // Remove powered by header
    this.app.disable('x-powered-by');

    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for API
      crossOriginEmbedderPolicy: false
    }));

    // CORS setup
    const corsOptions = {
      origin: this.getCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };
    this.app.use(cors(corsOptions));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = this.generateRequestId();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // General rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // Trust proxy in production
    if (process.env.NODE_ENV === 'production') {
      this.app.set('trust proxy', 1);
    }

    logInfo('Middleware setup complete');
  }

  // Setup all routes
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Root route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'MoneyWise API',
        version: '1.0.0',
        endpoints: {
          docs: '/api/docs',
          health: '/health'
        }
      });
    });

    // API routes
    this.app.use('/api', apiRoutes);

    // API documentation
    this.app.get('/api/docs', (req: Request, res: Response) => {
      res.json({
        title: 'MoneyWise API Documentation',
        version: '1.0.0',
        endpoints: {
          auth: {
            'POST /api/auth/register': 'Register new user',
            'POST /api/auth/login': 'Login user',
            'POST /api/auth/refresh': 'Refresh token',
            'GET /api/auth/profile': 'Get user profile',
            'PUT /api/auth/profile': 'Update user profile'
          },
          transactions: {
            'GET /api/transactions': 'Get transactions',
            'POST /api/transactions': 'Create transaction',
            'PUT /api/transactions/:id': 'Update transaction',
            'DELETE /api/transactions/:id': 'Delete transaction'
          },
          financial: {
            'GET /api/financial/current': 'Get current month data',
            'POST /api/financial/current': 'Update current month data',
            'GET /api/financial/historical': 'Get historical data'
          },
          upload: {
            'POST /api/upload/csv': 'Upload CSV file',
            'GET /api/upload/history': 'Get upload history'
          },
          chat: {
            'POST /api/chat/message': 'Send message to AI',
            'GET /api/chat/history': 'Get chat history'
          }
        }
      });
    });

    logInfo('Routes setup complete');
  }

  // Setup error handling
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        requestId: req.id
      });
    });

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      logError('Application error', {
        error: error.message,
        url: req.url,
        method: req.method,
        requestId: req.id
      });

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

    // Process error handlers
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

    logInfo('Error handling setup complete');
  }

  // Get CORS origins based on environment
  private getCorsOrigins(): string[] {
    if (process.env.NODE_ENV === 'production') {
      return process.env.FRONTEND_URL?.split(',') || ['https://your-domain.com'];
    }
    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173'
    ];
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Graceful shutdown
  private async shutdown(): Promise<void> {
    logInfo('Shutting down server...');
    
    try {
      // Close database connections
      await db.closeConnection();
      logInfo('Database connections closed');

      // Close server
      if (this.server) {
        this.server.close(() => {
          logInfo('Server closed');
          process.exit(0);
        });

        // Force close after 10 seconds
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

  // Start the server
  async start(): Promise<void> {
    try {
      // Initialize database first
      await this.initializeDatabase();

      // Start server
      this.server = this.app.listen(this.port, () => {
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

  // Get app instance (for testing)
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