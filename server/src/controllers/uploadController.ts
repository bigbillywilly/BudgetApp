// server/src/controllers/uploadController.ts - COMPLETE IMPLEMENTATION
import { Request, Response } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logInfo, logError } from '../utils/logger';
import { csvProcessingService } from '../services/csvProcessingService';
import { categoryService } from '../services/categoryService';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

class UploadController {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  // POST /api/upload/csv - COMPLETE IMPLEMENTATION
  async uploadCSV(req: Request, res: Response) {
    const client = await this.pool.connect();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No CSV file uploaded'
        });
      }

      const userId = req.user.userId;
      const file = req.file;
      const uploadId = uuidv4();

      logInfo('CSV upload started', {
        userId,
        filename: file.originalname,
        size: file.size,
        uploadId
      });

      await client.query('BEGIN');

      // 1. Create upload record
      await client.query(`
        INSERT INTO csv_uploads (id, user_id, filename, file_size, status)
        VALUES ($1, $2, $3, $4, 'processing')
      `, [uploadId, userId, file.originalname, file.size]);

      // 2. Read and process CSV file
      const csvContent = fs.readFileSync(file.path, 'utf8');
      const processedData = await csvProcessingService.processCSV(csvContent);

      logInfo('CSV processed', {
        userId,
        uploadId,
        transactionCount: processedData.transactions.length,
        categories: Object.keys(processedData.categoryBreakdown.ai).length
      });

      // 3. Insert transactions into database
      let insertedCount = 0;
      
      for (const transaction of processedData.transactions) {
        try {
          await client.query(`
            INSERT INTO transactions (
              id, user_id, transaction_date, posted_date, card_no, 
              description, category, amount, type, csv_upload_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            uuidv4(),
            userId,
            transaction.transactionDate,
            transaction.postedDate || transaction.transactionDate,
            transaction.cardNumber || null,
            transaction.description,
            transaction.aiCategory, // Use AI-categorized category
            transaction.amount,
            transaction.type === 'debit' ? 'expense' : 'income',
            uploadId
          ]);
          insertedCount++;
        } catch (error) {
          logError('Failed to insert transaction', { error, transaction });
        }
      }

      // 4. Update upload record with results
      await client.query(`
        UPDATE csv_uploads 
        SET processed_transactions = $1, status = 'completed'
        WHERE id = $2
      `, [insertedCount, uploadId]);

      // 5. Get user's monthly budget to calculate spending analysis
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const monthlyDataResult = await client.query(`
        SELECT income, fixed_expenses, savings_goal 
        FROM monthly_data 
        WHERE user_id = $1 AND month = $2 AND year = $3
      `, [userId, currentMonth, currentYear]);

      let budgetAnalysis = null;
      
      if (monthlyDataResult.rows.length > 0) {
        const monthlyData = monthlyDataResult.rows[0];
        const availableToSpend = parseFloat(monthlyData.income) - 
                                parseFloat(monthlyData.fixed_expenses) - 
                                parseFloat(monthlyData.savings_goal);
        
        const totalSpent = processedData.transactions
          .filter(t => t.type === 'debit')
          .reduce((sum, t) => sum + t.amount, 0);

        budgetAnalysis = {
          availableToSpend: availableToSpend,
          totalSpent: totalSpent,
          remaining: availableToSpend - totalSpent,
          percentageUsed: availableToSpend > 0 ? (totalSpent / availableToSpend) * 100 : 0,
          isOverBudget: totalSpent > availableToSpend,
          monthlyBudget: {
            income: parseFloat(monthlyData.income),
            fixedExpenses: parseFloat(monthlyData.fixed_expenses),
            savingsGoal: parseFloat(monthlyData.savings_goal)
          }
        };
      }

      await client.query('COMMIT');

      // 6. Clean up uploaded file
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        logError('Failed to delete uploaded file', error);
      }

      // 7. Return comprehensive response
      res.json({
        success: true,
        message: 'CSV file processed successfully',
        data: {
          uploadId,
          filename: file.originalname,
          size: file.size,
          uploadDate: new Date().toISOString(),
          processedTransactions: insertedCount,
          summary: {
            totalTransactions: processedData.transactions.length,
            totalDebits: processedData.summary.totalDebits,
            totalCredits: processedData.summary.totalCredits,
            netAmount: processedData.summary.netAmount,
            dateRange: processedData.summary.dateRange
          },
          categoryBreakdown: processedData.categoryBreakdown.ai,
          budgetAnalysis,
          insights: processedData.insights,
          categories: Object.keys(processedData.categoryBreakdown.ai)
        }
      });

      logInfo('CSV upload completed successfully', {
        userId,
        uploadId,
        processedTransactions: insertedCount,
        budgetAnalysis: budgetAnalysis ? 'included' : 'no_monthly_data'
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      logError('CSV upload error', error);

      // Clean up file on error
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          logError('Failed to cleanup file after error', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to process CSV file',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    } finally {
      client.release();
    }
  }

  // GET /api/upload/history
  async getUploadHistory(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.pool.query(`
        SELECT 
          id,
          filename,
          file_size,
          processed_transactions,
          upload_date,
          status,
          error_message
        FROM csv_uploads 
        WHERE user_id = $1 
        ORDER BY upload_date DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      const countResult = await this.pool.query(
        'SELECT COUNT(*) as total FROM csv_uploads WHERE user_id = $1',
        [userId]
      );

      res.json({
        success: true,
        data: {
          uploads: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit,
            offset,
            hasMore: (offset + limit) < parseInt(countResult.rows[0].total)
          }
        }
      });

    } catch (error: any) {
      logError('Get upload history error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get upload history'
      });
    }
  }

  // GET /api/upload/:id/transactions
  async getUploadTransactions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const uploadId = req.params.id;

      const result = await this.pool.query(`
        SELECT 
          id, transaction_date, posted_date, card_no, description, 
          category, amount, type, created_at
        FROM transactions 
        WHERE user_id = $1 AND csv_upload_id = $2
        ORDER BY transaction_date DESC
      `, [userId, uploadId]);

      res.json({
        success: true,
        data: {
          uploadId,
          transactions: result.rows
        }
      });

    } catch (error: any) {
      logError('Get upload transactions error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get upload transactions'
      });
    }
  }

  // DELETE /api/upload/:id
  async deleteUpload(req: Request, res: Response) {
    const client = await this.pool.connect();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const uploadId = req.params.id;

      await client.query('BEGIN');

      // Check if upload exists and belongs to user
      const uploadResult = await client.query(
        'SELECT id, filename FROM csv_uploads WHERE id = $1 AND user_id = $2',
        [uploadId, userId]
      );

      if (uploadResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found'
        });
      }

      // Delete related transactions
      const deleteTransactionsResult = await client.query(
        'DELETE FROM transactions WHERE csv_upload_id = $1 AND user_id = $2',
        [uploadId, userId]
      );

      // Delete upload record
      await client.query(
        'DELETE FROM csv_uploads WHERE id = $1 AND user_id = $2',
        [uploadId, userId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Upload and related transactions deleted successfully',
        data: {
          uploadId,
          deletedTransactions: deleteTransactionsResult.rowCount || 0
        }
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      logError('Delete upload error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete upload'
      });
    } finally {
      client.release();
    }
  }

  // GET /api/upload/:id/analysis - NEW: Get spending analysis for specific upload
  async getUploadAnalysis(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const uploadId = req.params.id;

      // Get upload info
      const uploadResult = await this.pool.query(
        'SELECT filename, upload_date FROM csv_uploads WHERE id = $1 AND user_id = $2',
        [uploadId, userId]
      );

      if (uploadResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found'
        });
      }

      // Get transactions from this upload
      const transactionsResult = await this.pool.query(`
        SELECT category, amount, type, transaction_date
        FROM transactions 
        WHERE csv_upload_id = $1 AND user_id = $2
      `, [uploadId, userId]);

      // Calculate spending by category
      const spendingByCategory: { [key: string]: number } = {};
      let totalSpent = 0;
      let totalIncome = 0;

      transactionsResult.rows.forEach(row => {
        if (row.type === 'expense') {
          spendingByCategory[row.category] = (spendingByCategory[row.category] || 0) + parseFloat(row.amount);
          totalSpent += parseFloat(row.amount);
        } else {
          totalIncome += parseFloat(row.amount);
        }
      });

      // Get monthly budget for comparison
      const currentDate = new Date();
      const monthlyDataResult = await this.pool.query(`
        SELECT income, fixed_expenses, savings_goal 
        FROM monthly_data 
        WHERE user_id = $1 AND month = $2 AND year = $3
      `, [userId, currentDate.getMonth() + 1, currentDate.getFullYear()]);

      let budgetComparison = null;
      
      if (monthlyDataResult.rows.length > 0) {
        const monthlyData = monthlyDataResult.rows[0];
        const availableToSpend = parseFloat(monthlyData.income) - 
                                parseFloat(monthlyData.fixed_expenses) - 
                                parseFloat(monthlyData.savings_goal);

        budgetComparison = {
          budgetedAmount: availableToSpend,
          actualSpent: totalSpent,
          difference: availableToSpend - totalSpent,
          percentageUsed: availableToSpend > 0 ? (totalSpent / availableToSpend) * 100 : 0,
          isOverBudget: totalSpent > availableToSpend
        };
      }

      res.json({
        success: true,
        data: {
          upload: uploadResult.rows[0],
          summary: {
            totalTransactions: transactionsResult.rows.length,
            totalSpent,
            totalIncome,
            netAmount: totalIncome - totalSpent
          },
          spendingByCategory,
          budgetComparison,
          topCategories: Object.entries(spendingByCategory)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, amount]) => ({ category, amount }))
        }
      });

    } catch (error: any) {
      logError('Get upload analysis error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get upload analysis'
      });
    }
  }
}

export const uploadController = new UploadController();