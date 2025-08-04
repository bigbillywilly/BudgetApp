// server/src/config/redis.ts
import { createClient, RedisClientType } from 'redis';
import { logInfo, logError, logWarn } from '../utils/logger';

// Redis configuration interface for connection parameters
export interface RedisConfig {
  url: string;
  host: string;
  port: number;
  password?: string;
  db: number;
  retryAttempts: number;
  retryDelay: number;
}

// Redis configuration manager with optional caching support
class RedisConfiguration {
  private config: RedisConfig;
  private client: RedisClientType | null = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!process.env.REDIS_URL;
    this.config = this.loadConfiguration();
    
    if (!this.isEnabled) {
      logWarn('Redis URL not provided - Redis features will be disabled');
    }
  }

  // Parse Redis configuration from environment variables
  private loadConfiguration(): RedisConfig {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);
    
    return {
      url: redisUrl,
      host: url.hostname || 'localhost',
      port: parseInt(url.port) || 6379,
      password: url.password || process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000')
    };
  }

  public getConfig(): RedisConfig {
    return { ...this.config };
  }

  // Create Redis client with automatic reconnection
  public async createClient(): Promise<RedisClientType | null> {
    if (!this.isEnabled) {
      logWarn('Redis is disabled - skipping client creation');
      return null;
    }

    if (this.client) {
      return this.client;
    }

    try {
      this.client = createClient({
        url: this.config.url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.config.retryAttempts) {
              logError('Redis: Maximum retry attempts reached');
              return false;
            }
            return Math.min(retries * this.config.retryDelay, 5000);
          }
        }
      });

      // Event handlers for connection monitoring
      this.client.on('error', (err) => {
        logError('Redis Client Error', err);
      });

      this.client.on('connect', () => {
        logInfo('Redis connected successfully');
      });

      this.client.on('disconnect', () => {
        logWarn('Redis disconnected');
      });

      await this.client.connect();
      
      logInfo('Redis client created and connected', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db
      });

      return this.client;
    } catch (error) {
      logError('Failed to create Redis client', error);
      this.client = null;
      return null;
    }
  }

  // Test Redis connectivity with ping command
  public async testConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      await this.client.ping();
      logInfo('Redis connection test successful');
      return true;
    } catch (error) {
      logError('Redis connection test failed', error);
      return false;
    }
  }

  // Gracefully close Redis connection
  public async closeConnection(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.client = null;
        logInfo('Redis connection closed');
      } catch (error) {
        logError('Error closing Redis connection', error);
      }
    }
  }

  public getClient(): RedisClientType | null {
    return this.client;
  }

  public isRedisEnabled(): boolean {
    return this.isEnabled;
  }

  // Health check for monitoring systems
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    lastError?: string;
  }> {
    const startTime = Date.now();
    
    try {
      if (!this.isEnabled || !this.client) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastError: 'Redis is disabled or client not initialized'
        };
      }

      await this.client.ping();
      
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance for application-wide use
export const redisConfig = new RedisConfiguration();

// Convenience exports for common operations
export const getRedisConfig = () => redisConfig.getConfig();
export const createRedisClient = () => redisConfig.createClient();
export const testRedisConnection = () => redisConfig.testConnection();
export const closeRedisConnection = () => redisConfig.closeConnection();
export const getRedisClient = () => redisConfig.getClient();
export const isRedisEnabled = () => redisConfig.isRedisEnabled();
export const getRedisHealthCheck = () => redisConfig.healthCheck();