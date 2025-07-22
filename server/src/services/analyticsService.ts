// server/src/services/analyticsService.ts
import { Pool } from 'pg';
import { db } from '../database/connection';
import { logError } from '../utils/logger';

interface SpendingByCategory {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

interface MonthlyTrend {
  month: number;
  year: number;
  income: number;
  expenses: number;
  savings: number;
}

interface BudgetAnalysis {
  totalBudgeted: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  categories: Array<{
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
    status: 'under' | 'over' | 'on-track';
  }>;
}

class AnalyticsService {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  // Get spending breakdown by category for a specific period
  async getSpendingByCategory(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<SpendingByCategory[]> {
    try {
      const result = await this.pool.query(`
        SELECT 
          category,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions 
        WHERE user_id = $1 
          AND type = 'expense'
          AND transaction_date BETWEEN $2 AND $3
        GROUP BY category
        ORDER BY total_amount DESC
      `, [userId, startDate, endDate]);

      // Calculate total for percentage calculation
      const totalSpent = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0);

      return result.rows.map(row => ({
        category: row.category,
        amount: parseFloat(row.total_amount),
        percentage: totalSpent > 0 ? (parseFloat(row.total_amount) / totalSpent) * 100 : 0,
        transactionCount: parseInt(row.transaction_count)
      }));
    } catch (error) {
      logError('Failed to get spending by category', error);
      throw error;
    }
  }

  // Get monthly trends for the past year
  async getMonthlyTrends(userId: string): Promise<MonthlyTrend[]> {
    try {
      const result = await this.pool.query(`
        SELECT 
          EXTRACT(MONTH FROM t.transaction_date) as month,
          EXTRACT(YEAR FROM t.transaction_date) as year,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as expenses,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as savings
        FROM transactions t
        WHERE t.user_id = $1 
          AND t.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY EXTRACT(YEAR FROM t.transaction_date), EXTRACT(MONTH FROM t.transaction_date)
        ORDER BY year, month
      `, [userId]);

      return result.rows.map(row => ({
        month: parseInt(row.month),
        year: parseInt(row.year),
        income: parseFloat(row.income),
        expenses: parseFloat(row.expenses),
        savings: parseFloat(row.savings)
      }));
    } catch (error) {
      logError('Failed to get monthly trends', error);
      throw error;
    }
  }

  // Analyze budget vs actual spending
  async getBudgetAnalysis(userId: string, month: number, year: number): Promise<BudgetAnalysis | null> {
    try {
      // Get planned budget
      const budgetResult = await this.pool.query(
        'SELECT income, fixed_expenses, savings_goal FROM monthly_data WHERE user_id = $1 AND month = $2 AND year = $3',
        [userId, month, year]
      );

      if (budgetResult.rows.length === 0) {
        return null;
      }

      const budget = budgetResult.rows[0];
      const availableToBudget = parseFloat(budget.income) - parseFloat(budget.fixed_expenses) - parseFloat(budget.savings_goal);

      // Get actual spending by category
      const spendingResult = await this.pool.query(`
        SELECT 
          category,
          SUM(amount) as spent
        FROM transactions 
        WHERE user_id = $1 
          AND type = 'expense'
          AND EXTRACT(MONTH FROM transaction_date) = $2
          AND EXTRACT(YEAR FROM transaction_date) = $3
        GROUP BY category
      `, [userId, month, year]);

      const totalSpent = spendingResult.rows.reduce((sum, row) => sum + parseFloat(row.spent), 0);

      // Simple budget allocation (equal distribution among categories for now)
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
          status
        };
      });

      return {
        totalBudgeted: availableToBudget,
        totalSpent,
        remaining: availableToBudget - totalSpent,
        percentageUsed: availableToBudget > 0 ? (totalSpent / availableToBudget) * 100 : 0,
        categories
      };
    } catch (error) {
      logError('Failed to get budget analysis', error);
      throw error;
    }
  }

  // Get insights and recommendations
  async getFinancialInsights(userId: string): Promise<{
    insights: string[];
    recommendations: string[];
    alerts: string[];
  }> {
    try {
      const insights: string[] = [];
      const recommendations: string[] = [];
      const alerts: string[] = [];

      // Get recent trends
      const trends = await this.getMonthlyTrends(userId);
      
      if (trends.length >= 2) {
        const recent = trends[trends.length - 1];
        const previous = trends[trends.length - 2];
        
        // Income trend analysis
        if (recent.income > previous.income) {
          insights.push(`Your income increased by $${(recent.income - previous.income).toFixed(2)} from last month`);
        } else if (recent.income < previous.income) {
          insights.push(`Your income decreased by $${(previous.income - recent.income).toFixed(2)} from last month`);
        }

        // Expense trend analysis
        if (recent.expenses > previous.expenses * 1.1) {
          alerts.push('Your spending increased significantly this month');
          recommendations.push('Review your recent expenses to identify areas where you can cut back');
        }

        // Savings analysis
        if (recent.savings < 0) {
          alerts.push('You spent more than you earned this month');
          recommendations.push('Consider creating a stricter budget to avoid overspending');
        } else if (recent.savings > previous.savings) {
          insights.push(`Great job! You saved $${(recent.savings - previous.savings).toFixed(2)} more than last month`);
        }
      }

      // Get category analysis for current month
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const categorySpending = await this.getSpendingByCategory(userId, startOfMonth, endOfMonth);
      
      if (categorySpending.length > 0) {
        const topCategory = categorySpending[0];
        insights.push(`Your biggest expense category this month is ${topCategory.category} at $${topCategory.amount.toFixed(2)}`);
        
        if (topCategory.percentage > 40) {
          recommendations.push(`${topCategory.category} represents ${topCategory.percentage.toFixed(1)}% of your spending. Consider if this is aligned with your priorities`);
        }
      }

      return { insights, recommendations, alerts };
    } catch (error) {
      logError('Failed to get financial insights', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();