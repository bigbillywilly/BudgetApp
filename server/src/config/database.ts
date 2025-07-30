// server/src/config/database.ts - WITH DEBUG LOGGING
import { Pool, PoolConfig } from 'pg';
import { logInfo, logError, logWarn } from '../utils/logger';

// Force IPv4 for Supabase connection
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_URL_IPV4 = DATABASE_URL?.replace('db.plnpicftnscwdaegwrzk.supabase.co', '54.88.73.86'); // Use IP instead of hostname

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

class DatabaseConfiguration {
  private config: DatabaseConfig;
  private pool: Pool | null = null;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): DatabaseConfig {
    // Ensure .env is loaded before reading environment variables
    try {
      require('dotenv').config();
    } catch (error) {
      console.log('Note: dotenv not available or already loaded');
    }

    // DEBUG: Log what environment variables we're seeing
    console.log('\n🔍 DEBUGGING ENVIRONMENT VARIABLES:');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PASSWORD exists:', !!process.env.DB_PASSWORD);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('All env keys that start with DB_:', Object.keys(process.env).filter(key => key.startsWith('DB_')));

    // Force DATABASE_URL usage in production
    if (process.env.DATABASE_URL) {
      console.log('\n✅ Using DATABASE_URL for connection');
      return {
        connectionString: process.env.DATABASE_URL,
        ssl: true,
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      };
    }
    
    // Fallback to individual config only if DATABASE_URL doesn't exist
    // Use individual environment variables (local development)
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

    console.log('\n🔍 FINAL DATABASE CONFIGURATION:');
    console.log('Host:', config.host);
    console.log('Port:', config.port);
    console.log('Database:', config.database);
    console.log('User:', config.user);
    console.log('Password set:', !!config.password);
    console.log('SSL:', config.ssl);
    console.log('Max connections:', config.max);
    console.log('');

    return config;
  }

  private validateConfiguration(): void {
    // If using DATABASE_URL, skip individual field validation
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

    // Validate port
    if (isNaN(this.config.port ?? NaN) || (this.config.port ?? 0) <= 0 || (this.config.port ?? 0) > 65535) {
      throw new Error('Invalid database port number');
    }

    // Validate connection limits
    if (this.config.max <= 0) {
      throw new Error('Maximum connections must be greater than 0');
    }

    if (this.config.min < 0) {
      throw new Error('Minimum connections cannot be negative');
    }

    if (this.config.min > this.config.max) {
      throw new Error('Minimum connections cannot exceed maximum connections');
    }

    logInfo('Database configuration validated');
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }

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

  public createPool(): Pool {
    if (this.pool) {
      return this.pool;
    }

    if (process.env.DATABASE_URL) {
      console.log('\n🔗 Creating pool with DATABASE_URL (FORCING IPv4 - AGGRESSIVE)...');
      
      // Parse the DATABASE_URL to extract components
      const url = new URL(process.env.DATABASE_URL);
      
      // Force DNS to IPv4 at Node.js level
      const dns = require('dns');
      dns.setDefaultResultOrder('ipv4first');
      
      // Use a known working Supabase IPv4 address
      this.pool = new Pool({
        host: '3.120.254.237', // Alternative Supabase IPv4 IP
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'agNcMmWVuKndFcoP',
        ssl: { rejectUnauthorized: false },
        max: this.config.max,
        min: this.config.min,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        // Explicitly force IPv4
        family: 4
      });
      
      logInfo('Database pool created with aggressive IPv4 forcing', {
        host: '3.120.254.237',
        maxConnections: this.config.max
      });
    } else {
      console.log('\n🔗 Creating pool with individual config...');
      const poolConfig = this.getPoolConfig();
      this.pool = new Pool(poolConfig);
      
      logInfo('Database pool created with individual config', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        maxConnections: this.config.max
      });
    }

    // Basic error handling
    this.pool.on('error', (err) => {
      logError('Database pool error', { error: err.message });
    });

    return this.pool;
  }

  public async testConnection(pool?: Pool): Promise<boolean> {
    const testPool = pool || this.createPool();
    
    console.log('\n🧪 TESTING DATABASE CONNECTION...');
    if (process.env.DATABASE_URL) {
      console.log('Using DATABASE_URL connection');
    } else {
      console.log('Using individual config:', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user
      });
    }
    
    try {
      console.log('1. Attempting to get client from pool...');
      const client = await testPool.connect();
      
      console.log('2. Client connected! Running test query...');
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();

      console.log('3. ✅ SUCCESS! Database connection working!');
      console.log('   PostgreSQL Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
      console.log('   Current Time:', result.rows[0].current_time);

      logInfo('Database connection test successful', {
        currentTime: result.rows[0].current_time,
        connectionMethod: process.env.DATABASE_URL ? 'DATABASE_URL' : 'individual_config',
        version: result.rows[0].version.split(' ').slice(0, 2).join(' ')
      });

      return true;
    } catch (error: any) {
      console.log('❌ DATABASE CONNECTION FAILED!');
      console.log('Error Message:', error.message);
      console.log('Error Code:', error.code);
      console.log('Error Details:', error.detail);
      console.log('Full Error:', error);

      logError('Database connection test failed - DETAILED', {
        errorMessage: error.message,
        errorCode: error.code,
        errorDetail: error.detail,
        connectionMethod: process.env.DATABASE_URL ? 'DATABASE_URL' : 'individual_config'
      });
      
      return false;
    }
  }

  public async getDatabaseInfo(pool?: Pool): Promise<{
    version: string;
    size: string;
    tableCount: number;
  } | null> {
    const testPool = pool || this.createPool();
    
    try {
      const client = await testPool.connect();
      
      // Get PostgreSQL version
      const versionResult = await client.query('SELECT version()');
      const version = versionResult.rows[0].version;

      // Get database size
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      const size = sizeResult.rows[0].size;

      // Get table count
      const tableResult = await client.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      const tableCount = parseInt(tableResult.rows[0].table_count);

      client.release();

      return {
        version: version.split(' ').slice(0, 2).join(' '),
        size,
        tableCount
      };
    } catch (error) {
      logError('Failed to get database information', error);
      return null;
    }
  }

  public async closePool(): Promise<void> {
    if (this.pool) {
      logInfo('Closing database pool...');
      await this.pool.end();
      this.pool = null;
      logInfo('Database pool closed');
    }
  }

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

        logWarn('Database query failed, retrying...', {
          attempt,
          maxRetries,
          error: lastError.message
        });

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

// Export singleton instance
export const databaseConfig = new DatabaseConfiguration();

// Export convenience functions
export const getDatabaseConfig = () => databaseConfig.getConfig();
export const getPoolConfig = () => databaseConfig.getPoolConfig();
export const createDatabasePool = () => databaseConfig.createPool();
export const testDatabaseConnection = () => databaseConfig.testConnection();
export const getDatabaseInfo = () => databaseConfig.getDatabaseInfo();
export const closeDatabasePool = () => databaseConfig.closePool();
export const getDatabaseHealthCheck = () => databaseConfig.healthCheck();