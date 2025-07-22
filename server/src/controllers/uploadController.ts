// server/src/controllers/uploadController.ts
import { Request, Response } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logInfo, logError } from '../utils/logger';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only allow CSV files
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
    files: 1 // Only one file at a time
  }
});

// Transaction categorization using AI/rules
const categorizeTransaction = (description: string, amount: number): string => {
  const desc = description.toLowerCase();
  
  // Food & Dining
  if (desc.includes('restaurant') || desc.includes('food') || desc.includes('pizza') || 
      desc.includes('mcdonald') || desc.includes('starbucks') || desc.includes('grocery') ||
      desc.includes('safeway') || desc.includes('walmart') || desc.includes('target food')) {
    return 'Food & Dining';
  }
  
  // Transportation
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('chevron') ||
      desc.includes('shell') || desc.includes('uber') || desc.includes('lyft') ||
      desc.includes('transit') || desc.includes('parking')) {
    return 'Transportation';
  }
  
  // Bills & Utilities
  if (desc.includes('electric') || desc.includes('water') || desc.includes('internet') ||
      desc.includes('phone') || desc.includes('insurance') || desc.includes('rent') ||
      desc.includes('mortgage') || desc.includes('utility')) {
    return 'Bills & Utilities';
  }
  
  // Entertainment
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('movie') ||
      desc.includes('theater') || desc.includes('game') || desc.includes('entertainment')) {
    return 'Entertainment';
  }
  
  // Shopping
  if (desc.includes('amazon') || desc.includes('target') || desc.includes('walmart') ||
      desc.includes('store') || desc.includes('retail') || desc.includes('shopping')) {
    return 'Shopping';
  }
  
  // Healthcare
  if (desc.includes('pharmacy') || desc.includes('medical') || desc.includes('doctor') ||
      desc.includes('hospital') || desc.includes('health')) {
    return 'Healthcare';
  }
  
  // Income (positive amounts or salary-like descriptions)
  if (amount > 0 || desc.includes('salary') || desc.includes('paycheck') || 
      desc.includes('deposit') || desc.includes('income')) {
    return 'Income';
  }
  
  // Default
  return 'Other';
};

class UploadController {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  // POST /api/upload/csv
  async uploadCSV(req: Request, res: Response) {
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

      // Create upload record
      await this.pool.query(`
        INSERT INTO csv_uploads (id, user_id, filename, file_size, status)
        VALUES ($1, $2, $3, $4, 'processing')
      `, [uploadId, userId, file.originalname, file.size]);

      // Process CSV file
      const transactions: any[] = [];
      const errors: string[] = [];

      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(file.path)
          .pipe(csv({
            mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_')
          }))
          .on('data', (row) => {
            try {
              // Handle different CSV formats
              const transactionDate = this.parseDate(row.transaction_date || row.date || row.posted_date);
              const postedDate = this.parseDate(row.posted_date || row.transaction_date);
              const description = (row.description || row.desc || '').trim();
              const cardNo = row.card_no || row.card_number || null;
              
              // Handle amount - could be in debit/credit columns or single amount column
              let amount = 0;
              let type: 'income' | 'expense' = 'expense';
              
              if (row.debit && parseFloat(row.debit) > 0) {
                amount = Math.abs(parseFloat(row.debit));
                type = 'expense';
              } else if (row.credit && parseFloat(row.credit) > 0) {
                amount = Math.abs(parseFloat(row.credit));
                type = 'income';
              } else if (row.amount) {
                amount = Math.abs(parseFloat(row.amount));
                type = parseFloat(row.amount) > 0 ? 'income' : 'expense';
              }

              // Skip if no valid amount or description
              if (!amount || !description || !transactionDate) {
                errors.push(`Invalid transaction data: ${JSON.stringify(row)}`);
                return;
              }

              // Auto-categorize transaction
              const category = row.category || categorizeTransaction(description, amount);

              transactions.push({
                userId,
                transactionDate,
                postedDate,
                cardNo,
                description,
                category,
                amount,
                type,
                csvUploadId: uploadId
              });
            } catch (error) {
              errors.push(`Error processing row: ${error}`);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Insert transactions into database
      const client = await this.pool.connect();
      let insertedCount = 0;

      try {
        await client.query('BEGIN');

        for (const transaction of transactions) {
          try {
            await client.query(`
              INSERT INTO transactions (
                user_id, transaction_date, posted_date, card_no, 
                description, category, amount, type, csv_upload_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              transaction.userId,
              transaction.transactionDate,
              transaction.postedDate,
              transaction.cardNo,
              transaction.description,
              transaction.category,
              transaction.amount,
              transaction.type,
              transaction.csvUploadId
            ]);
            insertedCount++;
          } catch (error) {
            errors.push(`Failed to insert transaction: ${transaction.description} - ${error}`);
          }
        }

        // Update upload status
        await client.query(`
          UPDATE csv_uploads 
          SET status = 'completed', processed_transactions = $1
          WHERE id = $2
        `, [insertedCount, uploadId]);

        await client.query('COMMIT');

        // Clean up uploaded file
        fs.unlinkSync(file.path);

        logInfo('CSV upload completed', {
          userId,
          uploadId,
          totalRows: transactions.length,
          insertedCount,
          errorCount: errors.length
        });

        res.json({
          success: true,
          message: 'CSV file processed successfully',
          data: {
            uploadId,
            totalRows: transactions.length,
            processedTransactions: insertedCount,
            errors: errors.length > 0 ? errors.slice(0, 10) : [], // Return first 10 errors
            summary: {
              income: transactions.filter(t => t.type === 'income').length,
              expenses: transactions.filter(t => t.type === 'expense').length,
              categories: [...new Set(transactions.map(t => t.category))]
            }
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error: any) {
      logError('CSV upload error', error);

      // Update upload status to failed if we have an upload ID
      try {
        if (req.body.uploadId) {
          await this.pool.query(`
            UPDATE csv_uploads 
            SET status = 'failed', error_message = $1
            WHERE id = $2
          `, [error.message, req.body.uploadId]);
        }
      } catch (updateError) {
        logError('Failed to update upload status', updateError);
      }

      // Clean up uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          logError('Failed to clean up uploaded file', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to process CSV file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
          id, filename, file_size, processed_transactions, 
          upload_date, status, error_message
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
            hasMore: offset + limit < parseInt(countResult.rows[0].total)
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

  // GET /api/upload/:uploadId/transactions
  async getUploadTransactions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const uploadId = req.params.uploadId;

      // Verify upload belongs to user
      const uploadResult = await this.pool.query(
        'SELECT id FROM csv_uploads WHERE id = $1 AND user_id = $2',
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
        SELECT 
          id, transaction_date, description, category, 
          amount, type, created_at
        FROM transactions 
        WHERE csv_upload_id = $1 
        ORDER BY transaction_date DESC
      `, [uploadId]);

      res.json({
        success: true,
        data: {
          uploadId,
          transactions: transactionsResult.rows
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

  // DELETE /api/upload/:uploadId
  async deleteUpload(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const uploadId = req.params.uploadId;

      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        // Verify upload belongs to user
        const uploadResult = await client.query(
          'SELECT id FROM csv_uploads WHERE id = $1 AND user_id = $2',
          [uploadId, userId]
        );

        if (uploadResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Upload not found'
          });
        }

        // Delete associated transactions
        const deleteTransactionsResult = await client.query(
          'DELETE FROM transactions WHERE csv_upload_id = $1',
          [uploadId]
        );

        // Delete upload record
        await client.query(
          'DELETE FROM csv_uploads WHERE id = $1',
          [uploadId]
        );

        await client.query('COMMIT');

        logInfo('Upload deleted', {
          userId,
          uploadId,
          deletedTransactions: deleteTransactionsResult.rowCount
        });

        res.json({
          success: true,
          message: 'Upload and associated transactions deleted successfully',
          data: {
            deletedTransactions: deleteTransactionsResult.rowCount
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error: any) {
      logError('Delete upload error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete upload'
      });
    }
  }

  // Helper method to parse dates in various formats
  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;

    // Try various date formats
    const formats = [
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    ];

    const trimmed = dateStr.trim();
    
    try {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (error) {
      logError('Date parsing error', { dateStr, error });
    }

    return null;
  }
}

export const uploadController = new UploadController();
