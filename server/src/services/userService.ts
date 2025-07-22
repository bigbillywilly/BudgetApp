// server/src/services/userService.ts
import { Pool } from 'pg';
import { db } from '../database/connection';
import { logInfo, logError } from '../utils/logger';

interface UserStats {
  totalMonths: number;
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
}

interface UserSummary {
  user: {
    id: string;
    name: string;
    email: string;
    memberSince: Date;
  };
  stats: UserStats;
  recentActivity: {
    lastLogin?: Date;
    lastTransaction?: Date;
    lastUpload?: Date;
  };
}

class UserService {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  // Get comprehensive user summary
  async getUserSummary(userId: string): Promise<UserSummary> {
    const client = await this.pool.connect();
    
    try {
      // Get user basic info
      const userResult = await client.query(
        'SELECT id, name, email, last_login, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get user statistics
      const statsResult = await client.query(`
        SELECT 
          COUNT(DISTINCT md.id) as total_months,
          COUNT(DISTINCT t.id) as total_transactions,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
          COALESCE(AVG(CASE WHEN t.type = 'income' THEN t.amount END), 0) as avg_income,
          COALESCE(AVG(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as avg_expense
        FROM users u
        LEFT JOIN monthly_data md ON u.id = md.user_id
        LEFT JOIN transactions t ON u.id = t.user_id
        WHERE u.id = $1
        GROUP BY u.id
      `, [userId]);

      const stats = statsResult.rows[0] || {
        total_months: 0,
        total_transactions: 0,
        total_income: 0,
        total_expenses: 0,
        avg_income: 0,
        avg_expense: 0
      };

      // Get recent activity dates
      const activityResult = await client.query(`
        SELECT 
          (SELECT MAX(transaction_date) FROM transactions WHERE user_id = $1) as last_transaction,
          (SELECT MAX(upload_date) FROM csv_uploads WHERE user_id = $1) as last_upload
      `, [userId]);

      const activity = activityResult.rows[0] || {};

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          memberSince: user.created_at
        },
        stats: {
          totalMonths: parseInt(stats.total_months) || 0,
          totalTransactions: parseInt(stats.total_transactions) || 0,
          totalIncome: parseFloat(stats.total_income) || 0,
          totalExpenses: parseFloat(stats.total_expenses) || 0,
          netWorth: (parseFloat(stats.total_income) || 0) - (parseFloat(stats.total_expenses) || 0),
          averageMonthlyIncome: parseFloat(stats.avg_income) || 0,
          averageMonthlyExpenses: parseFloat(stats.avg_expense) || 0
        },
        recentActivity: {
          lastLogin: user.last_login,
          lastTransaction: activity.last_transaction,
          lastUpload: activity.last_upload
        }
      };
    } catch (error) {
      logError('Failed to get user summary', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user's monthly financial breakdown
  async getMonthlyBreakdown(userId: string, year?: number): Promise<any[]> {
    try {
      const targetYear = year || new Date().getFullYear();
      
      const result = await this.pool.query(`
        SELECT 
          md.month,
          md.year,
          md.income,
          md.fixed_expenses,
          md.savings_goal,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as actual_expenses,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as actual_income,
          COUNT(t.id) as transaction_count
        FROM monthly_data md
        LEFT JOIN transactions t ON md.user_id = t.user_id 
          AND EXTRACT(MONTH FROM t.transaction_date) = md.month
          AND EXTRACT(YEAR FROM t.transaction_date) = md.year
        WHERE md.user_id = $1 AND md.year = $2
        GROUP BY md.id, md.month, md.year, md.income, md.fixed_expenses, md.savings_goal
        ORDER BY md.month
      `, [userId, targetYear]);

      return result.rows.map(row => ({
        month: row.month,
        year: row.year,
        planned: {
          income: parseFloat(row.income),
          fixedExpenses: parseFloat(row.fixed_expenses),
          savingsGoal: parseFloat(row.savings_goal)
        },
        actual: {
          income: parseFloat(row.actual_income),
          expenses: parseFloat(row.actual_expenses)
        },
        transactionCount: parseInt(row.transaction_count),
        availableToSpend: parseFloat(row.income) - parseFloat(row.fixed_expenses) - parseFloat(row.savings_goal),
        savingsRate: parseFloat(row.income) > 0 ? (parseFloat(row.savings_goal) / parseFloat(row.income)) * 100 : 0
      }));
    } catch (error) {
      logError('Failed to get monthly breakdown', error);
      throw error;
    }
  }

  // Delete user account and all associated data
  async deleteUserAccount(userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete in order to respect foreign key constraints
      await client.query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM csv_uploads WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM monthly_data WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
      
      logInfo('User account deleted', { userId });
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Failed to delete user account', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export const userService = new UserService();