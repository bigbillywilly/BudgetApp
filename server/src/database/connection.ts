// server/src/database/connection.ts - SYNCED WITH database.ts
import { Pool } from 'pg';
import { databaseConfig } from '../config/database';
import { logInfo, logError } from '../utils/logger';

class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor() {
    // Let database.ts handle all the configuration and pool creation
    this.pool = databaseConfig.createPool();
  }

  // Singleton pattern
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  // Get pool instance
  public getPool(): Pool {
    return this.pool;
  }

  // Test database connection - delegates to databaseConfig for consistency
  public async testConnection(): Promise<boolean> {
    return await databaseConfig.testConnection(this.pool);
  }

  // Get database information - delegates to databaseConfig
  public async getDatabaseInfo() {
    return await databaseConfig.getDatabaseInfo(this.pool);
  }

  // Get pool statistics - delegates to databaseConfig
  public getPoolStats() {
    return databaseConfig.getPoolStats();
  }

  // Health check - delegates to databaseConfig
  public async healthCheck() {
    return await databaseConfig.healthCheck();
  }

  // Close all connections - delegates to databaseConfig
  public async closeConnection(): Promise<void> {
    try {
      await databaseConfig.closePool();
      logInfo('Database connection closed via connection.ts');
    } catch (error) {
      logError('Error closing database connection via connection.ts', error);
      throw error;
    }
  }

  // Execute query with retry logic - delegates to databaseConfig
  public async executeWithRetry<T extends any[] = any[]>(
    query: string, 
    params?: any[], 
    maxRetries?: number, 
    retryDelay?: number
  ): Promise<T> {
    return await databaseConfig.executeWithRetry<T>(query, params, maxRetries, retryDelay);
  }

  // Additional helper method to get the current configuration
  public getConfig() {
    return databaseConfig.getConfig();
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();