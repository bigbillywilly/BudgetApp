// server/src/routes/financial.routes.ts - COMPLETE REPLACEMENT
import { Router } from 'express';
import { db } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { logInfo, logError } from '../utils/logger';

const router = Router();

console.log('Loading financial routes with database integration...');

// All financial routes require authentication
router.use(authenticateToken);

// Get current month financial data
router.get('/current', async (req, res) => {
  const pool = db.getPool();
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userId = req.user.userId;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    logInfo('Getting current month financial data from database', { userId, month: currentMonth, year: currentYear });

    const result = await pool.query(`
      SELECT month, year, income, fixed_expenses, savings_goal, created_at, updated_at
      FROM monthly_data 
      WHERE user_id = $1 AND month = $2 AND year = $3
    `, [userId, currentMonth, currentYear]);

    if (result.rows.length > 0) {
      const data = result.rows[0];
      res.json({
        success: true,
        data: {
          month: parseInt(data.month),
          year: parseInt(data.year),
          income: parseFloat(data.income),
          fixedExpenses: parseFloat(data.fixed_expenses),
          savingsGoal: parseFloat(data.savings_goal),
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      });
    } else {
      // Return default structure for new users
      res.json({
        success: true,
        data: {
          month: currentMonth,
          year: currentYear,
          income: 0,
          fixedExpenses: 0,
          savingsGoal: 0
        }
      });
    }
  } catch (error) {
    logError('Failed to get current month data from database', error);
    res.status(500).json({ success: false, message: 'Failed to get current month data' });
  }
});

// Update current month financial data (upsert)
router.post('/current', async (req, res) => {
  const pool = db.getPool();
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userId = req.user.userId;
    const { income, fixedExpenses, savingsGoal } = req.body;

    // Input validation
    if (typeof income !== 'number' || typeof fixedExpenses !== 'number' || typeof savingsGoal !== 'number') {
      return res.status(400).json({ success: false, message: 'Income, fixed expenses, and savings goal must be numbers' });
    }
    if (income < 0 || fixedExpenses < 0 || savingsGoal < 0) {
      return res.status(400).json({ success: false, message: 'Values cannot be negative' });
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    logInfo('Updating current month financial data in database', { userId, month: currentMonth, year: currentYear, income, fixedExpenses, savingsGoal });

    // UPSERT for monthly_data
    const result = await pool.query(`
      INSERT INTO monthly_data (user_id, month, year, income, fixed_expenses, savings_goal)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, month, year) 
      DO UPDATE SET 
        income = EXCLUDED.income,
        fixed_expenses = EXCLUDED.fixed_expenses,
        savings_goal = EXCLUDED.savings_goal,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, currentMonth, currentYear, income, fixedExpenses, savingsGoal]);

    const data = result.rows[0];
    res.json({
      success: true,
      message: 'Financial data updated successfully in database',
      data: {
        month: parseInt(data.month),
        year: parseInt(data.year),
        income: parseFloat(data.income),
        fixedExpenses: parseFloat(data.fixed_expenses),
        savingsGoal: parseFloat(data.savings_goal),
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });
  } catch (error) {
    logError('Failed to update current month data in database', error);
    res.status(500).json({ success: false, message: 'Failed to update financial data' });
  }
});

// Get historical financial data (default: last 12 months)
router.get('/historical', async (req, res) => {
  const pool = db.getPool();
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit as string) || 12;

    logInfo('Getting historical financial data from database', { userId, limit });

    const result = await pool.query(`
      SELECT month, year, income, fixed_expenses, savings_goal, created_at, updated_at
      FROM monthly_data 
      WHERE user_id = $1 
      ORDER BY year DESC, month DESC
      LIMIT $2
    `, [userId, limit]);

    const historicalData = result.rows.map(row => ({
      month: parseInt(row.month),
      year: parseInt(row.year),
      income: parseFloat(row.income),
      fixedExpenses: parseFloat(row.fixed_expenses),
      savingsGoal: parseFloat(row.savings_goal),
      availableToSpend: parseFloat(row.income) - parseFloat(row.fixed_expenses) - parseFloat(row.savings_goal),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      success: true,
      data: historicalData
    });
  } catch (error) {
    logError('Failed to get historical data from database', error);
    res.status(500).json({ success: false, message: 'Failed to get historical data' });
  }
});

// Get comprehensive financial summary for current month
router.get('/summary', async (req, res) => {
  const pool = db.getPool();
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userId = req.user.userId;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    logInfo('Getting financial summary from database', { userId });

    // Get budget data
    const budgetResult = await pool.query(`
      SELECT income, fixed_expenses, savings_goal
      FROM monthly_data 
      WHERE user_id = $1 AND month = $2 AND year = $3
    `, [userId, currentMonth, currentYear]);

    // Get current month spending from transactions
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0);

    const spendingResult = await pool.query(`
      SELECT 
        SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as total_spent,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE user_id = $1 
        AND transaction_date BETWEEN $2 AND $3
    `, [userId, startOfMonth.toISOString().split('T')[0], endOfMonth.toISOString().split('T')[0]]);

    const budget = budgetResult.rows[0] || { income: 0, fixed_expenses: 0, savings_goal: 0 };
    const spending = spendingResult.rows[0] || { total_spent: 0, total_income: 0, transaction_count: 0 };

    const availableToSpend = parseFloat(budget.income) - parseFloat(budget.fixed_expenses) - parseFloat(budget.savings_goal);
    const totalSpent = parseFloat(spending.total_spent) || 0;

    res.json({
      success: true,
      data: {
        budget: {
          income: parseFloat(budget.income),
          fixedExpenses: parseFloat(budget.fixed_expenses),
          savingsGoal: parseFloat(budget.savings_goal),
          availableToSpend
        },
        spending: {
          totalSpent,
          totalIncome: parseFloat(spending.total_income) || 0,
          transactionCount: parseInt(spending.transaction_count) || 0,
          remaining: availableToSpend - totalSpent,
          percentageUsed: availableToSpend > 0 ? (totalSpent / availableToSpend) * 100 : 0
        },
        month: currentMonth,
        year: currentYear
      }
    });
  } catch (error) {
    logError('Failed to get financial summary from database', error);
    res.status(500).json({ success: false, message: 'Failed to get financial summary' });
  }
});

// Development-only test route for database connectivity and schema checks
if (process.env.NODE_ENV === 'development') {
  router.get('/test', async (req, res) => {
    const pool = db.getPool();
    try {
      // Test database connection and schema
      const dbTest = await pool.query('SELECT NOW() as current_time');
      const tableTest = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'monthly_data'
      `);
      const userDataTest = req.user ? await pool.query(
        'SELECT COUNT(*) as count FROM monthly_data WHERE user_id = $1',
        [req.user.userId]
      ) : null;

      res.json({ 
        success: true,
        message: 'Financial routes are working with real database controllers',
        tests: {
          databaseConnection: dbTest.rows[0],
          monthlyDataTable: tableTest.rows.length > 0 ? 'EXISTS' : 'MISSING',
          userDataCount: userDataTest ? userDataTest.rows[0].count : 'N/A (no auth)'
        },
        user: req.user,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Financial routes test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

console.log('Real financial routes configured with database controllers');

export { router as financialRoutes };