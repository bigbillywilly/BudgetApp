// server/src/database/connection.ts
import { Pool } from 'pg';
import { logInfo, logError } from '../utils/logger';

class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'moneywise',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logError('Unexpected error on idle client', err);
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      logInfo('Database connection successful', { timestamp: result.rows[0].now });
      return true;
    } catch (error) {
      logError('Database connection failed', error);
      return false;
    }
  }

  public async closeConnection(): Promise<void> {
    try {
      await this.pool.end();
      logInfo('Database connection pool closed');
    } catch (error) {
      logError('Error closing database connection pool', error);
    }
  }
}

export const db = DatabaseConnection.getInstance();