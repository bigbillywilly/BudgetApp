// server/src/controllers/transactionController.ts - REAL VERSION
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { db } from '../database/connection';
import { logInfo, logError } from '../utils/logger';

export const transactionController = {
  // GET /api/transactions
  async getTransactions(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const category = req.query.category as string;
      const type = req.query.type as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const offset = (page - 1) * limit;
      let whereConditions = ['user_id = $1'];
      let queryParams: any[] = [userId];
      let paramCount = 2;

      // Add filters
      if (category) {
        whereConditions.push(`category = $${paramCount}`);
        queryParams.push(category);
        paramCount++;
      }

      if (type && (type === 'income' || type === 'expense')) {
        whereConditions.push(`type = $${paramCount}`);
        queryParams.push(type);
        paramCount++;
      }

      if (startDate) {
        whereConditions.push(`transaction_date >= $${paramCount}`);
        queryParams.push(startDate);
        paramCount++;
      }

      if (endDate) {
        whereConditions.push(`transaction_date <= $${paramCount}`);
        queryParams.push(endDate);
        paramCount++;
      }

      const whereClause = whereConditions.join(' AND ');

      logInfo('Getting transactions', { 
        userId, 
        page, 
        limit, 
        filters: { category, type, startDate, endDate } 
      });

      // Get transactions
      const transactionsResult = await pool.query(`
        SELECT id, transaction_date, posted_date, card_no, description, category, amount, type, created_at, updated_at
        FROM transactions 
        WHERE ${whereClause}
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...queryParams, limit, offset]);

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM transactions 
        WHERE ${whereClause}
      `, queryParams);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Format transactions
      const transactions = transactionsResult.rows.map(row => ({
        id: row.id,
        transaction_date: row.transaction_date,
        posted_date: row.posted_date,
        card_no: row.card_no,
        description: row.description,
        category: row.category,
        amount: parseFloat(row.amount),
        type: row.type,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        }
      });
    } catch (error) {
      logError('Get transactions error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transactions'
      });
    }
  },

  // GET /api/transactions/:id
  async getTransaction(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const transactionId = req.params.id;

      const result = await pool.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
        [transactionId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      const transaction = result.rows[0];

      res.json({
        success: true,
        data: {
          transaction: {
            id: transaction.id,
            transaction_date: transaction.transaction_date,
            posted_date: transaction.posted_date,
            card_no: transaction.card_no,
            description: transaction.description,
            category: transaction.category,
            amount: parseFloat(transaction.amount),
            type: transaction.type,
            created_at: transaction.created_at,
            updated_at: transaction.updated_at
          }
        }
      });
    } catch (error) {
      logError('Get transaction error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction'
      });
    }
  },

  // POST /api/transactions
  async createTransaction(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const { date, description, category, amount, type } = req.body;

      // Validate required fields
      if (!date || !description || !category || !amount || !type) {
        return res.status(400).json({
          success: false,
          message: 'Date, description, category, amount, and type are required'
        });
      }

      // Validate type
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type must be either "income" or "expense"'
        });
      }

      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }

      logInfo('Creating transaction', { userId, type, amount: numAmount, category });

      const result = await pool.query(`
        INSERT INTO transactions (user_id, transaction_date, description, category, amount, type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, date, description.trim(), category, numAmount, type]);

      const transaction = result.rows[0];

      logInfo('Transaction created', { userId, transactionId: transaction.id });

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: {
          transaction: {
            id: transaction.id,
            transaction_date: transaction.transaction_date,
            posted_date: transaction.posted_date,
            card_no: transaction.card_no,
            description: transaction.description,
            category: transaction.category,
            amount: parseFloat(transaction.amount),
            type: transaction.type,
            created_at: transaction.created_at,
            updated_at: transaction.updated_at
          }
        }
      });
    } catch (error) {
      logError('Create transaction error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create transaction'
      });
    }
  },

  // PUT /api/transactions/:id
  async updateTransaction(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const transactionId = req.params.id;
      const { description, category, amount, type } = req.body;

      const fields = [];
      const values = [];
      let paramCount = 1;

      if (description !== undefined) {
        fields.push(`description = $${paramCount}`);
        values.push(description.trim());
        paramCount++;
      }

      if (category !== undefined) {
        fields.push(`category = $${paramCount}`);
        values.push(category);
        paramCount++;
      }

      if (amount !== undefined) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number'
          });
        }
        fields.push(`amount = $${paramCount}`);
        values.push(numAmount);
        paramCount++;
      }

      if (type !== undefined) {
        if (!['income', 'expense'].includes(type)) {
          return res.status(400).json({
            success: false,
            message: 'Type must be either "income" or "expense"'
          });
        }
        fields.push(`type = $${paramCount}`);
        values.push(type);
        paramCount++;
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      values.push(transactionId, userId);

      logInfo('Updating transaction', { userId, transactionId, fields: fields.length });

      const result = await pool.query(`
        UPDATE transactions 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      const transaction = result.rows[0];

      logInfo('Transaction updated', { userId, transactionId });

      res.json({
        success: true,
        message: 'Transaction updated successfully',
        data: {
          transaction: {
            id: transaction.id,
            transaction_date: transaction.transaction_date,
            posted_date: transaction.posted_date,
            card_no: transaction.card_no,
            description: transaction.description,
            category: transaction.category,
            amount: parseFloat(transaction.amount),
            type: transaction.type,
            created_at: transaction.created_at,
            updated_at: transaction.updated_at
          }
        }
      });
    } catch (error) {
      logError('Update transaction error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update transaction'
      });
    }
  },

  // DELETE /api/transactions/:id
  async deleteTransaction(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const transactionId = req.params.id;

      logInfo('Deleting transaction', { userId, transactionId });

      const result = await pool.query(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
        [transactionId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      logInfo('Transaction deleted', { userId, transactionId });

      res.json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    } catch (error) {
      logError('Delete transaction error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete transaction'
      });
    }
  },

  // GET /api/transactions/categories
  async getCategories(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      const result = await pool.query(
        'SELECT name, description FROM transaction_categories WHERE is_default = true ORDER BY name'
      );

      res.json({
        success: true,
        data: { categories: result.rows }
      });
    } catch (error) {
      logError('Get categories error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get categories'
      });
    }
  },

  // GET /api/transactions/analytics/spending-by-category
  async getSpendingByCategory(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      logInfo('Getting spending by category', { userId, startDate, endDate });

      const result = await pool.query(`
        SELECT 
          category,
          SUM(ABS(amount)) as total_amount,
          COUNT(*) as transaction_count,
          AVG(ABS(amount)) as avg_amount
        FROM transactions 
        WHERE user_id = $1 
          AND type = 'expense'
          AND transaction_date BETWEEN $2 AND $3
        GROUP BY category
        ORDER BY total_amount DESC
      `, [userId, startDate, endDate]);

      // Calculate total for percentages
      const totalSpent = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0);

      const spendingData = result.rows.map(row => ({
        category: row.category,
        amount: parseFloat(row.total_amount),
        percentage: totalSpent > 0 ? (parseFloat(row.total_amount) / totalSpent) * 100 : 0,
        transactionCount: parseInt(row.transaction_count),
        averageAmount: parseFloat(row.avg_amount)
      }));

      res.json({
        success: true,
        data: { 
          spendingByCategory: spendingData,
          totalSpent,
          dateRange: { startDate, endDate }
        }
      });
    } catch (error) {
      logError('Get spending by category error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get spending analysis'
      });
    }
  },

  // GET /api/transactions/analytics/trends
  async getMonthlyTrends(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const months = parseInt(req.query.months as string) || 12;

      logInfo('Getting monthly trends', { userId, months });

      const result = await pool.query(`
        SELECT 
          EXTRACT(MONTH FROM transaction_date) as month,
          EXTRACT(YEAR FROM transaction_date) as year,
          type,
          SUM(ABS(amount)) as total,
          COUNT(*) as count
        FROM transactions 
        WHERE user_id = $1 
          AND transaction_date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date), type
        ORDER BY year, month
      `, [userId]);

      // Group by month/year
      const trendsMap: { [key: string]: any } = {};

      result.rows.forEach(row => {
        const key = `${row.year}-${row.month}`;
        if (!trendsMap[key]) {
          trendsMap[key] = {
            month: parseInt(row.month),
            year: parseInt(row.year),
            income: 0,
            expenses: 0,
            transactionCount: 0
          };
        }

        if (row.type === 'income') {
          trendsMap[key].income = parseFloat(row.total);
        } else {
          trendsMap[key].expenses = parseFloat(row.total);
        }
        trendsMap[key].transactionCount += parseInt(row.count);
      });

      // Convert to array and calculate net savings
      const trends = Object.values(trendsMap).map((trend: any) => ({
        ...trend,
        savings: trend.income - trend.expenses,
        savingsRate: trend.income > 0 ? ((trend.income - trend.expenses) / trend.income) * 100 : 0
      }));

      res.json({
        success: true,
        data: { trends }
      });
    } catch (error) {
      logError('Get monthly trends error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trends'
      });
    }
  }
};