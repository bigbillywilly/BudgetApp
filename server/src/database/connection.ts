import { Pool, PoolClient } from 'pg';
import { config } from '../config/environment';

class Database {
  private pool: Pool;
  
  constructor() {
    this.pool = new Pool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  // Get a client from the pool
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // Execute a query
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Test the connection
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as now');
      console.log('Database connected at:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  // Close all connections
  async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connection pool closed');
  }
}

// Create and export a single instance
export const database = new Database();