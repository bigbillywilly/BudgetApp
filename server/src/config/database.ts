// server/src/config/database.ts - WITHOUT DEBUG LOGGING
import { Pool, PoolConfig } from 'pg';
import { logInfo, logError, logWarn } from '../utils/logger';

// Database configuration interface for connection parameters
export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  connectionString?: string;
}

// Database configuration manager with connection pooling
class DatabaseConfiguration {
  private config: DatabaseConfig;
  private pool: Pool | null = null;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  // Load database configuration from environment variables
  private loadConfiguration(): DatabaseConfig {
    try {
      require('dotenv').config();
    } catch (error) {
      console.log('Note: dotenv not available or already loaded');
    }

    // Prefer DATABASE_URL for production/cloud deployments
    if (process.env.DATABASE_URL) {
      return {
        connectionString: process.env.DATABASE_URL,
        ssl: true,
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      };
    }
    
    // Fallback to individual environment variables for local development
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'moneywise',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false',
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      min: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
    };

    return config;
  }

  // Validate required configuration parameters
  private validateConfiguration(): void {
    if (process.env.DATABASE_URL) {
      logInfo('Database configuration validated (using DATABASE_URL)');
      return;
    }

    // Check required fields for individual config
    const requiredFields = ['host', 'database', 'user', 'password'];
    const missing = requiredFields.filter(field => !this.config[field as keyof DatabaseConfig]);

    if (missing.length > 0) {
      throw new Error(`Missing required database configuration: ${missing.join(', ')}`);
    }

    // Validate numeric constraints
    if (isNaN(this.config.port ?? NaN) || (this.config.port ?? 0) <= 0 || (this.config.port ?? 0) > 65535) {
      throw new Error('Invalid database port number');
    }

    if (this.config.max <= 0) {
      throw new Error('Maximum connections must be greater than 0');
    }

    if (this.config.min < 0 || this.config.min > this.config.max) {
      throw new Error('Invalid connection pool limits');
    }

    logInfo('Database configuration validated');
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  // Build PostgreSQL pool configuration object
  public getPoolConfig(): PoolConfig {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: this.config.max,
      min: this.config.min,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis
    };

    if (this.config.ssl) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    return poolConfig;
  }

  // Create connection pool instance
  public createPool(): Pool {
    if (this.pool) {
      return this.pool;
    }

    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 5,
        min: 1,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: 15000
      });
      
      logInfo('Database pool created with DATABASE_URL');
    } else {
      const poolConfig = this.getPoolConfig();
      this.pool = new Pool(poolConfig);
      
      logInfo('Database pool created', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        maxConnections: this.config.max
      });
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      logError('Database pool error', { error: err.message });
    });

    return this.pool;
  }

  // Test database connectivity
  public async testConnection(pool?: Pool): Promise<boolean> {
    const testPool = pool || this.createPool();
    
    try {
      const client = await testPool.connect();
      
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();

      logInfo('Database connection test successful', {
        currentTime: result.rows[0].current_time,
        connectionMethod: process.env.DATABASE_URL ? 'DATABASE_URL' : 'individual_config',
        version: result.rows[0].version.split(' ').slice(0, 2).join(' ')
      });

      return true;
    } catch (error: any) {
      logError('Database connection test failed', {
        errorMessage: error.message,
        errorCode: error.code,
        connectionMethod: process.env.DATABASE_URL ? 'DATABASE_URL' : 'individual_config'
      });
      
      return false;
    }
  }

  // Get database metadata and statistics
  public async getDatabaseInfo(pool?: Pool): Promise<{
    version: string;
    size: string;
    tableCount: number;
  } | null> {
    const testPool = pool || this.createPool();
    
    try {
      const client = await testPool.connect();
      
      // Get version, size, and table count in parallel
      const [versionResult, sizeResult, tableResult] = await Promise.all([
        client.query('SELECT version()'),
        client.query('SELECT pg_size_pretty(pg_database_size(current_database())) as size'),
        client.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'')
      ]);

      client.release();

      return {
        version: versionResult.rows[0].version.split(' ').slice(0, 2).join(' '),
        size: sizeResult.rows[0].size,
        tableCount: parseInt(tableResult.rows[0].table_count)
      };
    } catch (error) {
      logError('Failed to get database information', error);
      return null;
    }
  }

  // Close connection pool gracefully
  public async closePool(): Promise<void> {
    if (this.pool) {
      logInfo('Closing database pool...');
      await this.pool.end();
      this.pool = null;
      logInfo('Database pool closed');
    }
  }

  // Get current pool connection statistics
  public getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  // Health check for monitoring systems
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    poolStats: any;
    lastError?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const isConnected = await this.testConnection();
      const responseTime = Date.now() - startTime;
      const poolStats = this.getPoolStats();

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        responseTime,
        poolStats
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        poolStats: this.getPoolStats(),
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Execute query with automatic retry logic
  public async executeWithRetry<T extends any[] = any[]>(
    query: string,
    params?: any[],
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    const pool = this.createPool();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await pool.query(query, params);
        return result.rows as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    logError('Database query failed after all retries', {
      maxRetries,
      error: lastError?.message
    });

    throw lastError || new Error('Query failed after retries');
  }
}

// Singleton instance for application-wide use
export const databaseConfig = new DatabaseConfiguration();

// Convenience exports for common operations
export const getDatabaseConfig = () => databaseConfig.getConfig();
export const getPoolConfig = () => databaseConfig.getPoolConfig();
export const createDatabasePool = () => databaseConfig.createPool();
export const testDatabaseConnection = () => databaseConfig.testConnection();
export const getDatabaseInfo = () => databaseConfig.getDatabaseInfo();
export const closeDatabasePool = () => databaseConfig.closePool();
export const getDatabaseHealthCheck = () => databaseConfig.healthCheck();