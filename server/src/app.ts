// server/src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

// Import routes - temporarily removing rate limiter
import { apiRoutes } from './routes/index';
// Temporarily commenting out these imports to avoid issues
import { db } from './database/connection';
import { migrationRunner } from './database/migrationRunner';
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
    
    console.log('🏗️  Initializing MoneyWise App...');
    
    // Initialize in correct order
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    console.log('✅ MoneyWise App initialized');
  }

  // Database initialization (disabled for now)
  async initializeDatabase(): Promise<void> {
    try {
      console.log('⏩ Skipping database initialization for testing...');
      logInfo('Database initialization skipped');
      
      // Uncomment when ready to use database:
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

  // Setup all middleware
  private setupMiddleware(): void {
    console.log('🔧 Setting up middleware...');
    
    try {
      // Remove powered by header
      this.app.disable('x-powered-by');

      // Security headers
      this.app.use(helmet({
        contentSecurityPolicy: false,
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
      console.log('✅ CORS configured for:', this.getCorsOrigins());

      // Body parsing
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

      // Compression
      this.app.use(compression());

      // Logging
      if (process.env.NODE_ENV === 'development') {
        this.app.use(morgan('dev'));
      }

      // Request ID middleware
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        req.id = this.generateRequestId();
        res.setHeader('X-Request-ID', req.id);
        next();
      });

      // TEMPORARILY DISABLE RATE LIMITING TO AVOID ISSUES
      // Rate limiting with proper Express 4 syntax
      const rateLimit = require('express-rate-limit');
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      });
      this.app.use('/api', limiter);
      
      console.log('⚠️  Rate limiting disabled for testing');

      console.log('✅ Middleware setup complete');
    } catch (error) {
      console.error('❌ Middleware setup failed:', error);
      throw error;
    }
  }

  // Setup all routes
  private setupRoutes(): void {
    console.log('🛣️  Setting up routes...');
    
    try {
      // Root health check
      this.app.get('/health', (req: Request, res: Response) => {
        console.log('💓 Root health check');
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.0'
        });
      });

      // Root route
      this.app.get('/', (req: Request, res: Response) => {
        console.log('🏠 Root route');
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
        console.log(`🔍 API: ${req.method} ${req.path}`);
        next();
      });

      // Mount API routes
      console.log('📋 Mounting API routes...');
      this.app.use('/api', apiRoutes);

      console.log('✅ Routes setup complete');
    } catch (error) {
      console.error('❌ Routes setup failed:', error);
      throw error;
    }
  }

  // Setup error handling
  private setupErrorHandling(): void {
    console.log('🛡️  Setting up error handling...');
    
    try {
      // 404 handler
      this.app.use((req: Request, res: Response) => {
        console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
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

      // Global error handler
      this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
        console.error('🚨 App error:', error);
        
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
        console.error('💥 Uncaught Exception:', error);
        logError('Uncaught Exception', error);
        this.shutdown();
      });

      process.on('unhandledRejection', (reason: any) => {
        console.error('💥 Unhandled Rejection:', reason);
        logError('Unhandled Rejection', reason);
        this.shutdown();
      });

      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

      console.log('✅ Error handling setup complete');
    } catch (error) {
      console.error('❌ Error handling setup failed:', error);
      throw error;
    }
  }

  // Get CORS origins
  private getCorsOrigins(): string[] {
    if (process.env.NODE_ENV === 'production') {
      return process.env.FRONTEND_URL?.split(',') || ['https://your-domain.com'];
    }
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
  }

  // Generate request ID
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Graceful shutdown
  private async shutdown(): Promise<void> {
    console.log('🛑 Shutting down...');
    logInfo('Shutting down server...');
    
    try {
      // Close database connections (when enabled)
      // await db.closeConnection();
      console.log('✅ Database connections closed (skipped)');

      // Close server
      if (this.server) {
        this.server.close(() => {
          console.log('✅ Server closed gracefully');
          logInfo('Server closed');
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          console.error('⏰ Forcing server close');
          logError('Forcing server close');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      logError('Error during shutdown', error);
      process.exit(1);
    }
  }

  // Start the server
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting MoneyWise server...');
      
      // Initialize database first (but don't fail if it doesn't work)
      await this.initializeDatabase();

      // Start server
      this.server = this.app.listen(this.port, () => {
        console.log('\n✅ SERVER STARTED SUCCESSFULLY!');
        console.log(`🌐 Server running on: http://localhost:${this.port}`);
        console.log(`📋 API Documentation: http://localhost:${this.port}/api/docs`);
        console.log(`💓 Health Check: http://localhost:${this.port}/health`);
        console.log(`🧪 API Test: http://localhost:${this.port}/api/test`);
        console.log(`🔐 Auth Test: http://localhost:${this.port}/api/auth/test`);
        console.log(`👤 Register: POST http://localhost:${this.port}/api/auth/register`);
        console.log(`🔑 Login: POST http://localhost:${this.port}/api/auth/login\n`);
        
        logInfo(`Server started on port ${this.port}`, {
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version
        });
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${this.port} is already in use`);
          logError(`Port ${this.port} is already in use`);
          process.exit(1);
        } else {
          console.error('❌ Server error:', error);
          logError('Server error', error);
          process.exit(1);
        }
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      logError('Failed to start server', error);
      process.exit(1);
    }
  }

  // Get app instance
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