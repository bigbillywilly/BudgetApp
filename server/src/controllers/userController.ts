// server/src/controllers/userController.ts - REAL VERSION
import { Request, Response } from 'express';
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
    memberSince: string;
  };
  stats: UserStats;
  recentActivity: {
    lastLogin?: string;
    lastTransaction?: string;
    lastUpload?: string;
  };
}

export const userController = {
  // GET /api/users/summary
  async getUserSummary(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      logInfo('Getting user summary', { userId });

      // Get user basic info
      const userResult = await pool.query(
        'SELECT id, name, email, last_login, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Get comprehensive stats
      const statsResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT md.id) as total_months,
          COUNT(DISTINCT t.id) as total_transactions,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses
        FROM users u
        LEFT JOIN monthly_data md ON u.id = md.user_id
        LEFT JOIN transactions t ON u.id = t.user_id
        WHERE u.id = $1
        GROUP BY u.id
      `, [userId]);

      // Get average monthly stats
      const monthlyAveragesResult = await pool.query(`
        SELECT 
          AVG(CASE WHEN t.type = 'income' THEN t.amount END) as avg_monthly_income,
          AVG(CASE WHEN t.type = 'expense' THEN ABS(t.amount) END) as avg_monthly_expenses
        FROM transactions t
        WHERE t.user_id = $1
      `, [userId]);

      const stats = statsResult.rows[0] || {
        total_months: 0,
        total_transactions: 0,
        total_income: 0,
        total_expenses: 0
      };

      const averages = monthlyAveragesResult.rows[0] || {
        avg_monthly_income: 0,
        avg_monthly_expenses: 0
      };

      // Get recent activity
      const activityResult = await pool.query(`
        SELECT 
          (SELECT MAX(transaction_date) FROM transactions WHERE user_id = $1) as last_transaction,
          (SELECT MAX(upload_date) FROM csv_uploads WHERE user_id = $1) as last_upload
      `, [userId]);

      const activity = activityResult.rows[0] || {};

      const summary: UserSummary = {
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
          averageMonthlyIncome: parseFloat(averages.avg_monthly_income) || 0,
          averageMonthlyExpenses: parseFloat(averages.avg_monthly_expenses) || 0
        },
        recentActivity: {
          lastLogin: user.last_login,
          lastTransaction: activity.last_transaction,
          lastUpload: activity.last_upload
        }
      };

      res.json({
        success: true,
        data: { summary }
      });
    } catch (error) {
      logError('Failed to get user summary', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user summary'
      });
    }
  },

  // GET /api/users/monthly-breakdown
  async getMonthlyBreakdown(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      logInfo('Getting monthly breakdown', { userId, year });

      const result = await pool.query(`
        SELECT 
          md.month,
          md.year,
          md.income,
          md.fixed_expenses,
          md.savings_goal,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) as actual_expenses,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as actual_income,
          COUNT(t.id) as transaction_count
        FROM monthly_data md
        LEFT JOIN transactions t ON md.user_id = t.user_id 
          AND EXTRACT(MONTH FROM t.transaction_date) = md.month
          AND EXTRACT(YEAR FROM t.transaction_date) = md.year
        WHERE md.user_id = $1 AND md.year = $2
        GROUP BY md.id, md.month, md.year, md.income, md.fixed_expenses, md.savings_goal
        ORDER BY md.month
      `, [userId, year]);

      const breakdown = result.rows.map(row => {
        const plannedIncome = parseFloat(row.income);
        const plannedExpenses = parseFloat(row.fixed_expenses);
        const plannedSavings = parseFloat(row.savings_goal);
        const availableToSpend = plannedIncome - plannedExpenses - plannedSavings;

        return {
          month: row.month,
          year: row.year,
          planned: {
            income: plannedIncome,
            fixedExpenses: plannedExpenses,
            savingsGoal: plannedSavings,
            availableToSpend
          },
          actual: {
            income: parseFloat(row.actual_income),
            expenses: parseFloat(row.actual_expenses)
          },
          transactionCount: parseInt(row.transaction_count),
          savingsRate: plannedIncome > 0 ? (plannedSavings / plannedIncome) * 100 : 0,
          budgetUsage: availableToSpend > 0 ? (parseFloat(row.actual_expenses) / availableToSpend) * 100 : 0
        };
      });

      res.json({
        success: true,
        data: { breakdown }
      });
    } catch (error) {
      logError('Failed to get monthly breakdown', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get monthly breakdown'
      });
    }
  },

  // GET /api/users/budget-analysis
  async getBudgetAnalysis(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);

      if (!month || !year) {
        return res.status(400).json({
          success: false,
          message: 'Month and year are required'
        });
      }

      logInfo('Getting budget analysis', { userId, month, year });

      // Get budget data
      const budgetResult = await pool.query(
        'SELECT * FROM monthly_data WHERE user_id = $1 AND month = $2 AND year = $3',
        [userId, month, year]
      );

      if (budgetResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No budget data found for the specified month'
        });
      }

      const budget = budgetResult.rows[0];
      const availableToBudget = parseFloat(budget.income) - parseFloat(budget.fixed_expenses) - parseFloat(budget.savings_goal);

      // Get actual spending by category
      const spendingResult = await pool.query(`
        SELECT 
          category,
          SUM(ABS(amount)) as spent,
          COUNT(*) as transaction_count
        FROM transactions 
        WHERE user_id = $1 
          AND type = 'expense'
          AND EXTRACT(MONTH FROM transaction_date) = $2
          AND EXTRACT(YEAR FROM transaction_date) = $3
        GROUP BY category
        ORDER BY spent DESC
      `, [userId, month, year]);

      const totalSpent = spendingResult.rows.reduce((sum, row) => sum + parseFloat(row.spent), 0);

      const categories = spendingResult.rows.map(row => {
        const spent = parseFloat(row.spent);
        const budgetedPerCategory = availableToBudget / spendingResult.rows.length; // Simple equal distribution

        let status: 'under' | 'over' | 'on-track';
        if (spent > budgetedPerCategory * 1.1) {
          status = 'over';
        } else if (spent < budgetedPerCategory * 0.9) {
          status = 'under';
        } else {
          status = 'on-track';
        }

        return {
          category: row.category,
          budgeted: budgetedPerCategory,
          spent,
          remaining: budgetedPerCategory - spent,
          status,
          transactionCount: parseInt(row.transaction_count),
          percentage: totalSpent > 0 ? (spent / totalSpent) * 100 : 0
        };
      });

      const analysis = {
        month,
        year,
        budget: {
          income: parseFloat(budget.income),
          fixedExpenses: parseFloat(budget.fixed_expenses),
          savingsGoal: parseFloat(budget.savings_goal),
          availableToSpend: availableToBudget
        },
        actual: {
          totalSpent,
          remaining: availableToBudget - totalSpent,
          percentageUsed: availableToBudget > 0 ? (totalSpent / availableToBudget) * 100 : 0
        },
        categories,
        summary: {
          onTrackCategories: categories.filter(c => c.status === 'on-track').length,
          overBudgetCategories: categories.filter(c => c.status === 'over').length,
          underBudgetCategories: categories.filter(c => c.status === 'under').length
        }
      };

      res.json({
        success: true,
        data: { analysis }
      });
    } catch (error) {
      logError('Failed to get budget analysis', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get budget analysis'
      });
    }
  },

  // GET /api/users/insights
  async getInsights(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      logInfo('Getting financial insights', { userId });

      const insights: string[] = [];
      const recommendations: string[] = [];
      const alerts: string[] = [];

      // Get current month data
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Get current month transactions
      const currentMonthResult = await pool.query(`
        SELECT 
          type,
          category,
          SUM(ABS(amount)) as total,
          COUNT(*) as count
        FROM transactions 
        WHERE user_id = $1 
          AND EXTRACT(MONTH FROM transaction_date) = $2 
          AND EXTRACT(YEAR FROM transaction_date) = $3
        GROUP BY type, category
        ORDER BY total DESC
      `, [userId, currentMonth, currentYear]);

      // Get previous month for comparison
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const previousMonthResult = await pool.query(`
        SELECT 
          type,
          SUM(ABS(amount)) as total
        FROM transactions 
        WHERE user_id = $1 
          AND EXTRACT(MONTH FROM transaction_date) = $2 
          AND EXTRACT(YEAR FROM transaction_date) = $3
        GROUP BY type
      `, [userId, prevMonth, prevYear]);

      // Calculate current month totals
      const currentIncome = currentMonthResult.rows
        .filter(row => row.type === 'income')
        .reduce((sum, row) => sum + parseFloat(row.total), 0);

      const currentExpenses = currentMonthResult.rows
        .filter(row => row.type === 'expense')
        .reduce((sum, row) => sum + parseFloat(row.total), 0);

      // Calculate previous month totals
      const prevIncome = previousMonthResult.rows
        .filter(row => row.type === 'income')
        .reduce((sum, row) => sum + parseFloat(row.total), 0);

      const prevExpenses = previousMonthResult.rows
        .filter(row => row.type === 'expense')
        .reduce((sum, row) => sum + parseFloat(row.total), 0);

      // Generate insights
      if (currentIncome > prevIncome) {
        const increase = currentIncome - prevIncome;
        insights.push(`Your income increased by ${increase.toFixed(2)} from last month`);
      } else if (currentIncome < prevIncome) {
        const decrease = prevIncome - currentIncome;
        insights.push(`Your income decreased by ${decrease.toFixed(2)} from last month`);
      }

      if (currentExpenses > prevExpenses * 1.1) {
        const increase = currentExpenses - prevExpenses;
        alerts.push(`Your spending increased significantly by ${increase.toFixed(2)} this month`);
        recommendations.push('Review your recent expenses to identify areas where you can cut back');
      }

      // Check savings rate
      if (currentIncome > 0) {
        const savings = currentIncome - currentExpenses;
        const savingsRate = (savings / currentIncome) * 100;
        
        if (savings < 0) {
          alerts.push('You spent more than you earned this month');
          recommendations.push('Consider creating a stricter budget to avoid overspending');
        } else if (savingsRate < 10) {
          recommendations.push('Try to save at least 10% of your income each month');
        } else if (savingsRate > 20) {
          insights.push(`Excellent! You saved ${savingsRate.toFixed(1)}% of your income this month`);
        }
      }

      // Top spending category insights
      const expenseCategories = currentMonthResult.rows.filter(row => row.type === 'expense');
      if (expenseCategories.length > 0) {
        const topCategory = expenseCategories[0];
        const categoryTotal = parseFloat(topCategory.total);
        const categoryPercentage = currentExpenses > 0 ? (categoryTotal / currentExpenses) * 100 : 0;
        
        insights.push(`Your biggest expense category this month is ${topCategory.category} at ${categoryTotal.toFixed(2)}`);
        
        if (categoryPercentage > 40) {
          recommendations.push(`${topCategory.category} represents ${categoryPercentage.toFixed(1)}% of your spending. Consider if this aligns with your priorities`);
        }
      }

      // Get budget data for more insights
      const budgetResult = await pool.query(
        'SELECT * FROM monthly_data WHERE user_id = $1 AND month = $2 AND year = $3',
        [userId, currentMonth, currentYear]
      );

      if (budgetResult.rows.length > 0) {
        const budget = budgetResult.rows[0];
        const availableToSpend = parseFloat(budget.income) - parseFloat(budget.fixed_expenses) - parseFloat(budget.savings_goal);
        
        if (currentExpenses > availableToSpend) {
          const overspend = currentExpenses - availableToSpend;
          alerts.push(`You've exceeded your budget by ${overspend.toFixed(2)} this month`);
        } else if (currentExpenses < availableToSpend * 0.8) {
          insights.push('You\'re doing great staying under budget this month!');
        }
      }

      // Add general recommendations if none exist
      if (recommendations.length === 0) {
        recommendations.push('Keep tracking your expenses to maintain good financial habits');
        recommendations.push('Consider setting up automatic savings to reach your financial goals');
      }

      res.json({
        success: true,
        data: {
          insights: {
            insights,
            recommendations,
            alerts
          }
        }
      });
    } catch (error) {
      logError('Failed to get financial insights', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get insights'
      });
    }
  },

  // DELETE /api/users/account
  async deleteAccount(req: Request, res: Response) {
    const pool = db.getPool();
    const client = await pool.connect();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const { confirmDelete } = req.body;
      
      if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
        return res.status(400).json({
          success: false,
          message: 'Please confirm account deletion by sending confirmDelete: "DELETE_MY_ACCOUNT"'
        });
      }

      logInfo('Account deletion requested', { userId });

      await client.query('BEGIN');

      // Delete in order to respect foreign key constraints
      await client.query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM csv_uploads WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM monthly_data WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
      
      logInfo('User account deleted successfully', { userId });

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Failed to delete user account', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    } finally {
      client.release();
    }
  }
};