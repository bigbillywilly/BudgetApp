// server/src/routes/financial.routes.ts - REAL DATA VERSION
import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';
import { db } from '../database/connection';
import { logInfo, logError } from '../utils/logger';

const router = Router();

// Apply authentication to all financial routes
router.use(authenticateToken);

// GET /api/financial/current - Get current month financial data for authenticated user
router.get('/current', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.userId;
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    logInfo('Getting current month financial data', { userId, month, year });

    const pool = db.getPool();
    const result = await pool.query(
      'SELECT * FROM monthly_data WHERE user_id = $1 AND month = $2 AND year = $3',
      [userId, month, year]
    );

    if (result.rows.length > 0) {
      const data = result.rows[0];
      res.json({
        success: true,
        data: {
          month: data.month,
          year: data.year,
          income: parseFloat(data.income),
          fixedExpenses: parseFloat(data.fixed_expenses),
          savingsGoal: parseFloat(data.savings_goal)
        }
      });
    } else {
      // No data exists for current month, return defaults
      res.json({
        success: true,
        data: {
          month,
          year,
          income: 0,
          fixedExpenses: 0,
          savingsGoal: 0
        }
      });
    }
  } catch (error) {
    logError('Failed to get current month financial data', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial data'
    });
  }
});

// POST /api/financial/current - Update current month financial data for authenticated user
router.post('/current', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.userId;
    const { income, fixedExpenses, savingsGoal } = req.body;

    // Validate input
    if (income === undefined || fixedExpenses === undefined || savingsGoal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Income, fixedExpenses, and savingsGoal are required'
      });
    }

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    logInfo('Updating current month financial data', { 
      userId, 
      month, 
      year, 
      income, 
      fixedExpenses, 
      savingsGoal 
    });

    const pool = db.getPool();
    
    // Use UPSERT (INSERT ... ON CONFLICT ... DO UPDATE)
    const result = await pool.query(`
      INSERT INTO monthly_data (user_id, month, year, income, fixed_expenses, savings_goal, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, month, year) 
      DO UPDATE SET 
        income = EXCLUDED.income,
        fixed_expenses = EXCLUDED.fixed_expenses,
        savings_goal = EXCLUDED.savings_goal,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, month, year, income, fixedExpenses, savingsGoal]);

    const updatedData = result.rows[0];

    logInfo('Financial data updated successfully', { userId, month, year });

    res.json({
      success: true,
      message: 'Financial data updated successfully',
      data: {
        month: updatedData.month,
        year: updatedData.year,
        income: parseFloat(updatedData.income),
        fixedExpenses: parseFloat(updatedData.fixed_expenses),
        savingsGoal: parseFloat(updatedData.savings_goal)
      }
    });
  } catch (error) {
    logError('Failed to update current month financial data', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update financial data'
    });
  }
});

// GET /api/financial/historical - Get historical financial data for authenticated user
router.get('/historical', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.userId;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    logInfo('Getting historical financial data', { userId, year });

    const pool = db.getPool();
    const result = await pool.query(
      'SELECT * FROM monthly_data WHERE user_id = $1 AND year = $2 ORDER BY month ASC',
      [userId, year]
    );

    const historicalData = result.rows.map(row => ({
      month: row.month,
      year: row.year,
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
    logError('Failed to get historical financial data', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get historical data'
    });
  }
});

// GET /api/financial/summary - Get financial summary for authenticated user
router.get('/summary', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.userId;
    
    logInfo('Getting financial summary', { userId });

    const pool = db.getPool();
    
    // Get current month budget
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    
    const budgetResult = await pool.query(
      'SELECT * FROM monthly_data WHERE user_id = $1 AND month = $2 AND year = $3',
      [userId, month, year]
    );

    // Get current month transactions
    const transactionsResult = await pool.query(`
      SELECT 
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions 
      WHERE user_id = $1 
        AND EXTRACT(MONTH FROM transaction_date) = $2 
        AND EXTRACT(YEAR FROM transaction_date) = $3
      GROUP BY type
    `, [userId, month, year]);

    const budget = budgetResult.rows[0];
    const transactionSummary = transactionsResult.rows.reduce((acc: any, row: any) => {
      acc[row.type] = {
        total: parseFloat(row.total),
        count: parseInt(row.count)
      };
      return acc;
    }, {});

    const summary = {
      currentMonth: {
        month,
        year,
        budget: budget ? {
          income: parseFloat(budget.income),
          fixedExpenses: parseFloat(budget.fixed_expenses),
          savingsGoal: parseFloat(budget.savings_goal),
          availableToSpend: parseFloat(budget.income) - parseFloat(budget.fixed_expenses) - parseFloat(budget.savings_goal)
        } : null,
        actual: {
          income: transactionSummary.income?.total || 0,
          expenses: transactionSummary.expense?.total || 0,
          transactionCount: (transactionSummary.income?.count || 0) + (transactionSummary.expense?.count || 0)
        }
      }
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logError('Failed to get financial summary', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial summary'
    });
  }
});

export { router as financialRoutes };