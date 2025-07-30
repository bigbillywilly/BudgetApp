// server/src/config/environment.ts
import { logInfo, logError, logWarn } from '../utils/logger';

export interface EnvironmentConfig {
  // App Configuration
  nodeEnv: string;
  port: number;
  appName: string;
  appVersion: string;

  // Database Configuration
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    minConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
  };

  // Authentication Configuration
  auth: {
    jwtAccessSecret: string;
    jwtRefreshSecret: string;
    jwtAccessExpiry: string;
    jwtRefreshExpiry: string;
    bcryptSaltRounds: number;
  };

  // Security Configuration
  security: {
    encryptionKey: string;
    trustProxyHops: number;
    corsOrigins: string[];
  };

  // External Services
  services: {
    openaiApiKey?: string;
    redisUrl?: string;
    sentryDsn?: string;
  };

  // File Upload Configuration
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    uploadPath: string;
  };

  // Logging Configuration
  logging: {
    level: string;
    enableFileLogging: boolean;
    logDirectory: string;
  };

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authMaxRequests: number;
    uploadMaxRequests: number;
    chatMaxRequests: number;
  };
}

class EnvironmentConfiguration {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): EnvironmentConfig {
    return {
      // App Configuration
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '5000'),
      appName: process.env.APP_NAME || 'MoneyWise API',
      appVersion: process.env.npm_package_version || '1.0.0',

      // Database Configuration
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        name: process.env.DB_NAME || 'moneywise',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: process.env.DB_SSL === 'true',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      },

      // Authentication Configuration
      auth: {
        jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-me',
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me',
        jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
        bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
      },

      // Security Configuration
      security: {
        encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!',
        trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS || '1'),
        corsOrigins: this.parseCorsOrigins(),
      },

      // External Services
      services: {
        openaiApiKey: process.env.OPENAI_API_KEY,
        redisUrl: process.env.REDIS_URL,
        sentryDsn: process.env.SENTRY_DSN,
      },

      // File Upload Configuration
      upload: {
        maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '5242880'), // 5MB
        allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'text/csv,application/csv').split(','),
        uploadPath: process.env.UPLOAD_PATH || './uploads',
      },

      // Logging Configuration
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
        logDirectory: process.env.LOG_DIRECTORY || './logs',
      },

      // Rate Limiting Configuration
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '5'),
        uploadMaxRequests: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX_REQUESTS || '10'),
        chatMaxRequests: parseInt(process.env.RATE_LIMIT_CHAT_MAX_REQUESTS || '20'),
      },
    };
  }

  private parseCorsOrigins(): string[] {
    const frontendUrl = process.env.FRONTEND_URL;
    
    if (this.config?.nodeEnv === 'production') {
      const defaultProductionOrigins = [
        'https://budget-app-orpin-nu.vercel.app', // Main production URL
        // If you need to support patterns, handle them elsewhere in your CORS middleware
        // For now, only strings are allowed here
      ];
      
      if (frontendUrl) {
        return [...frontendUrl.split(',').map(url => url.trim()), ...defaultProductionOrigins];
      }
      
      return defaultProductionOrigins;
    }

    // Development origins
    const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'];
    
    if (frontendUrl) {
      return [...frontendUrl.split(',').map(url => url.trim()), ...defaultOrigins];
    }

    return defaultOrigins;
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    // Core application variables (always required)
    if (!this.config.port || this.config.port <= 0) {
      errors.push('Invalid or missing PORT');
    }

    if (!this.config.auth.jwtAccessSecret) {
      errors.push('Missing required environment variable: JWT_ACCESS_SECRET');
    }

    if (!this.config.auth.jwtRefreshSecret) {
      errors.push('Missing required environment variable: JWT_REFRESH_SECRET');
    }

    if (!this.config.security.encryptionKey) {
      errors.push('Missing required environment variable: ENCRYPTION_KEY');
    }

    // Database validation - ONLY check individual variables if DATABASE_URL is NOT present
    if (!process.env.DATABASE_URL) {
      // Only validate individual DB variables if DATABASE_URL doesn't exist
      if (!this.config.database.host) {
        errors.push('Missing required environment variable: DB_HOST');
      }

      if (!this.config.database.name) {
        errors.push('Missing required environment variable: DB_NAME');
      }

      if (!this.config.database.user) {
        errors.push('Missing required environment variable: DB_USER');
      }

      if (!this.config.database.password) {
        errors.push('Missing required environment variable: DB_PASSWORD');
      }
    } else {
      console.log('✅ Using DATABASE_URL - skipping individual DB variable validation');
    }

    // CORS validation
    if (!this.config.security.corsOrigins || this.config.security.corsOrigins.length === 0) {
      errors.push('Missing or invalid CORS origins configuration');
    }

    if (errors.length > 0) {
      logError('Environment configuration validation failed', { errors });
      throw new Error(`Environment validation failed: ${errors.join(', ')}`);
    }

    logInfo('Environment configuration validated successfully', {
      nodeEnv: this.config.nodeEnv,
      port: this.config.port,
      database: process.env.DATABASE_URL ? 'DATABASE_URL' : `${this.config.database.host}:${this.config.database.port}/${this.config.database.name}`,
      corsOrigins: this.config.security.corsOrigins.length,
      hasOpenAI: !!this.config.services.openaiApiKey,
      hasSentry: !!this.config.services.sentryDsn
    });
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  public isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }

  // Get sensitive information summary (for logging)
  public getSecuritySummary(): {
    hasCustomJwtSecrets: boolean;
    hasCustomEncryptionKey: boolean;
    sslEnabled: boolean;
    corsOriginsCount: number;
    hasOpenAI: boolean;
  } {
    return {
      hasCustomJwtSecrets: 
        this.config.auth.jwtAccessSecret !== 'default-access-secret-change-me' &&
        this.config.auth.jwtRefreshSecret !== 'default-refresh-secret-change-me',
      hasCustomEncryptionKey: this.config.security.encryptionKey !== 'default-encryption-key-32-chars!',
      sslEnabled: this.config.database.ssl,
      corsOriginsCount: this.config.security.corsOrigins.length,
      hasOpenAI: !!this.config.services.openaiApiKey
    };
  }
}

// Export singleton instance
export const environmentConfig = new EnvironmentConfiguration();

// Export convenience functions
export const getConfig = () => environmentConfig.getConfig();
export const isDevelopment = () => environmentConfig.isDevelopment();
export const isProduction = () => environmentConfig.isProduction();
export const isTest = () => environmentConfig.isTest();
export const getSecuritySummary = () => environmentConfig.getSecuritySummary();