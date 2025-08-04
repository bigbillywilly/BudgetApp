// server/src/database/migrationRunner.ts
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { db } from './connection';
import { logInfo, logError } from '../utils/logger';

interface Migration {
  id: number;
  name: string;
  filename: string;
  sql: string;
}

// Database migration runner with atomic execution and rollback support
class MigrationRunner {
  private pool: Pool;
  private migrationsPath: string;

  constructor() {
    this.pool = db.getPool();
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  // Initialize migrations tracking table for execution history
  private async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await this.pool.query(query);
      logInfo('Migrations table initialized');
    } catch (error) {
      logError('Failed to create migrations table', error);
      throw error;
    }
  }

  // Retrieve list of previously executed migrations from database
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const query = 'SELECT filename FROM migrations ORDER BY id';
      const result = await this.pool.query(query);
      return result.rows.map(row => row.filename);
    } catch (error) {
      // Handle fresh database without migrations table
      if (error instanceof Error && error.message.includes('does not exist')) {
        return [];
      }
      logError('Failed to get executed migrations', error);
      throw error;
    }
  }

  // Load and parse SQL migration files from filesystem
  private loadMigrationFiles(): Migration[] {
    try {
      if (!fs.existsSync(this.migrationsPath)) {
        logInfo(`Creating migrations directory: ${this.migrationsPath}`);
        fs.mkdirSync(this.migrationsPath, { recursive: true });
        return [];
      }

      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure sequential execution by filename

      if (files.length === 0) {
        logInfo('No migration files found');
        return [];
      }

      return files.map((filename, index) => {
        const filePath = path.join(this.migrationsPath, filename);
        const sql = fs.readFileSync(filePath, 'utf8');
        const name = filename.replace(/^\d+_/, '').replace('.sql', '');

        return {
          id: index + 1,
          name,
          filename,
          sql
        };
      });
    } catch (error) {
      logError('Failed to load migration files', error);
      throw error;
    }
  }

  // Execute single migration with transaction safety and tracking
  private async executeMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      logInfo(`Executing migration: ${migration.filename}`);
      await client.query('BEGIN');
      
      // Execute migration SQL within transaction
      await client.query(migration.sql);
      
      // Record successful execution for future runs
      await client.query(
        'INSERT INTO migrations (name, filename) VALUES ($1, $2)',
        [migration.name, migration.filename]
      );
      
      await client.query('COMMIT');
      logInfo(`Migration completed: ${migration.filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logError(`Migration failed: ${migration.filename}`, error);
      throw new Error(`Migration ${migration.filename} failed: ${error}`);
    } finally {
      client.release();
    }
  }

  // Run all pending migrations in sequential order
  public async runMigrations(): Promise<void> {
    try {
      logInfo('Starting database migrations...');
      
      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const allMigrations = this.loadMigrationFiles();
      
      // Filter out already executed migrations
      const pendingMigrations = allMigrations.filter(
        migration => !executedMigrations.includes(migration.filename)
      );

      if (pendingMigrations.length === 0) {
        logInfo('No pending migrations');
        return;
      }

      logInfo(`Found ${pendingMigrations.length} pending migrations`);
      
      // Execute migrations sequentially to maintain order dependencies
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      logInfo(`All migrations completed successfully. Total executed: ${pendingMigrations.length}`);
    } catch (error) {
      logError('Migration process failed', error);
      throw error;
    }
  }

  // Get migration status for debugging and monitoring
  public async getMigrationStatus(): Promise<{
    executed: string[];
    pending: string[];
    total: number;
  }> {
    try {
      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const allMigrations = this.loadMigrationFiles();
      
      const pendingMigrations = allMigrations
        .filter(migration => !executedMigrations.includes(migration.filename))
        .map(migration => migration.filename);

      return {
        executed: executedMigrations,
        pending: pendingMigrations,
        total: allMigrations.length
      };
    } catch (error) {
      logError('Failed to get migration status', error);
      throw error;
    }
  }

  // Reset migrations table for testing environments only
  public async resetMigrations(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset migrations in production environment');
    }

    try {
      await this.pool.query('DROP TABLE IF EXISTS migrations');
      logInfo('Migrations table reset');
    } catch (error) {
      logError('Failed to reset migrations', error);
      throw error;
    }
  }
}

// Export singleton instance
export const migrationRunner = new MigrationRunner();