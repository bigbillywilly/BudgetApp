// server/src/database/connection.ts - SYNCED WITH database.ts
import { Pool } from 'pg';
import { databaseConfig } from '../config/database';
import { logInfo, logError } from '../utils/logger';

// Singleton database connection wrapper with delegation to configuration layer
class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor() {
    // Delegate pool creation to configuration layer for consistency
    this.pool = databaseConfig.createPool();
  }

  // Singleton pattern for application-wide database access
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  // Delegate connection testing to configuration layer
  public async testConnection(): Promise<boolean> {
    return await databaseConfig.testConnection(this.pool);
  }

  public async getDatabaseInfo() {
    return await databaseConfig.getDatabaseInfo(this.pool);
  }

  public getPoolStats() {
    return databaseConfig.getPoolStats();
  }

  public async healthCheck() {
    return await databaseConfig.healthCheck();
  }

  // Close connection pool with proper cleanup
  public async closeConnection(): Promise<void> {
    try {
      await databaseConfig.closePool();
      logInfo('Database connection closed via connection.ts');
    } catch (error) {
      logError('Error closing database connection via connection.ts', error);
      throw error;
    }
  }

  // Execute queries with automatic retry logic for transient failures
  public async executeWithRetry<T extends any[] = any[]>(
    query: string, 
    params?: any[], 
    maxRetries?: number, 
    retryDelay?: number
  ): Promise<T> {
    return await databaseConfig.executeWithRetry<T>(query, params, maxRetries, retryDelay);
  }

  public getConfig() {
    return databaseConfig.getConfig();
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();