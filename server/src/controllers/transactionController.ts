// server/src/controllers/transactionController.ts
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { db } from '../database/connection';
import { logInfo, logError } from '../utils/logger';
import { analyticsService } from '../services/analyticsService';

class TransactionController {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  // GET /api/transactions
  async getTransactions(req: Request, res: Response) {
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

      // Get transactions
      const transactionsResult = await this.pool.query(`
        SELECT id, transaction_date, posted_date, card_no, description, category, amount, type, created_at
        FROM transactions 
        WHERE ${whereClause}
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...queryParams, limit, offset]);

      // Get total count
      const countResult = await this.pool.query(`
        SELECT COUNT(*) as total
        FROM transactions 
        WHERE ${whereClause}
      `, queryParams);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          transactions: transactionsResult.rows,
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
    } catch (error: any) {
      logError('Get transactions error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get transactions'
      });
    }
  }

  // GET /api/transactions/:id
  async getTransaction(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const transactionId = req.params.id;

      const result = await this.pool.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
        [transactionId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.json({
        success: true,
        data: { transaction: result.rows[0] }
      });
    } catch (error: any) {
      logError('Get transaction error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction'
      });
    }
  }

  // POST /api/transactions
  async createTransaction(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const { date, description, category, amount, type } = req.body;

      const result = await this.pool.query(`
        INSERT INTO transactions (user_id, transaction_date, description, category, amount, type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, date, description, category, amount, type]);

      logInfo('Transaction created', { userId, transactionId: result.rows[0].id });

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: { transaction: result.rows[0] }
      });
    } catch (error: any) {
      logError('Create transaction error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to create transaction'
      });
    }
  }

  // PUT /api/transactions/:id
  async updateTransaction(req: Request, res: Response) {
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
        values.push(description);
        paramCount++;
      }

      if (category !== undefined) {
        fields.push(`category = $${paramCount}`);
        values.push(category);
        paramCount++;
      }

      if (amount !== undefined) {
        fields.push(`amount = $${paramCount}`);
        values.push(amount);
        paramCount++;
      }

      if (type !== undefined) {
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

      const result = await this.pool.query(`
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

      logInfo('Transaction updated', { userId, transactionId });

      res.json({
        success: true,
        message: 'Transaction updated successfully',
        data: { transaction: result.rows[0] }
      });
    } catch (error: any) {
      logError('Update transaction error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to update transaction'
      });
    }
  }

  // DELETE /api/transactions/:id
  async deleteTransaction(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const transactionId = req.params.id;

      const result = await this.pool.query(
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
    } catch (error: any) {
      logError('Delete transaction error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete transaction'
      });
    }
  }

  // GET /api/transactions/categories
  async getCategories(req: Request, res: Response) {
    try {
      const result = await this.pool.query(
        'SELECT name, description FROM transaction_categories WHERE is_default = true ORDER BY name'
      );

      res.json({
        success: true,
        data: { categories: result.rows }
      });
    } catch (error: any) {
      logError('Get categories error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get categories'
      });
    }
  }

  // GET /api/transactions/analytics/spending-by-category
  async getSpendingByCategory(req: Request, res: Response) {
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

      const spendingData = await analyticsService.getSpendingByCategory(
        userId, 
        new Date(startDate), 
        new Date(endDate)
      );

      res.json({
        success: true,
        data: { spendingByCategory: spendingData }
      });
    } catch (error: any) {
      logError('Get spending by category error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get spending analysis'
      });
    }
  }

  // GET /api/transactions/analytics/trends
  async getMonthlyTrends(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const trends = await analyticsService.getMonthlyTrends(userId);

      res.json({
        success: true,
        data: { trends }
      });
    } catch (error: any) {
      logError('Get monthly trends error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get trends'
      });
    }
  }
}

export const transactionController = new TransactionController();
