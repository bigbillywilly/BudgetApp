import { Request, Response } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logInfo, logError, logWarn } from '../utils/logger';
import { csvProcessingService } from '../services/csvProcessingService';

// Configure multer for secure CSV file uploads
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

const fileFilter = (req: any, file: any, cb: multer.FileFilterCallback) => {
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

interface MulterRequest extends Request { 
  file?: any;
  files?: any;
}

// CSV upload controller with advanced duplicate detection and file overlap analysis
class UploadController {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  // Advanced duplicate detection with file overlap analysis to prevent re-uploads
  private async checkForDuplicates(
    client: any,
    userId: string,
    transactions: any[],
    currentFilename: string
  ): Promise<{
    newTransactions: any[];
    duplicateCount: number;
    duplicates: any[];
    duplicatesByUpload: Map<string, number>;
    fileOverlapAnalysis: {
      isPotentialReupload: boolean;
      overlapPercentage: number;
      mostSimilarUpload: any;
      overlapTransactionCount: number;
    };
  }> {
    const newTransactions = [];
    const duplicates = [];
    const duplicatesByUpload = new Map<string, number>();
    let duplicateCount = 0;

    logInfo('Starting duplicate check with file overlap analysis', {
      userId,
      totalTransactions: transactions.length,
      filename: currentFilename
    });

    // Process transactions in batches for database performance
    const batchSize = 100;
    const transactionChecks = transactions.map((transaction, index) => ({
      index,
      date: transaction.transactionDate,
      description: transaction.description.trim(),
      amount: transaction.amount,
      transaction
    }));

    for (let i = 0; i < transactionChecks.length; i += batchSize) {
      const batch = transactionChecks.slice(i, i + batchSize);
      
      for (const check of batch) {
        // Exact match detection: user_id, date, normalized description, amount within 1 cent
        const duplicateCheck = await client.query(`
          SELECT 
            t.id, 
            t.description, 
            t.amount, 
            t.csv_upload_id,
            t.created_at,
            cu.filename as upload_filename,
            cu.upload_date
          FROM transactions t
          LEFT JOIN csv_uploads cu ON t.csv_upload_id = cu.id
          WHERE t.user_id = $1 
            AND t.transaction_date = $2 
            AND LOWER(TRIM(REGEXP_REPLACE(t.description, '\\s+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE($3, '\\s+', ' ', 'g')))
            AND ABS(t.amount - $4) < 0.01
          ORDER BY t.created_at DESC
          LIMIT 5
        `, [
          userId,
          check.date,
          check.description,
          check.amount
        ]);

        if (duplicateCheck.rows.length > 0) {
          duplicateCount++;
          const existingTransaction = duplicateCheck.rows[0];
          
          // Track duplicates by source upload for overlap analysis
          if (existingTransaction.csv_upload_id) {
            const uploadCount = duplicatesByUpload.get(existingTransaction.csv_upload_id) || 0;
            duplicatesByUpload.set(existingTransaction.csv_upload_id, uploadCount + 1);
          }

          duplicates.push({
            date: check.date,
            description: check.description,
            amount: check.amount,
            existingId: existingTransaction.id,
            existingUploadId: existingTransaction.csv_upload_id,
            existingCreatedAt: existingTransaction.created_at,
            existingUploadFilename: existingTransaction.upload_filename,
            existingUploadDate: existingTransaction.upload_date,
            reason: 'exact_match'
          });
          
          logWarn('Duplicate transaction detected', {
            userId,
            date: check.date,
            description: check.description,
            amount: check.amount,
            existingTransactionId: existingTransaction.id,
            existingUploadId: existingTransaction.csv_upload_id,
            existingFilename: existingTransaction.upload_filename
          });
        } else {
          newTransactions.push(check.transaction);
        }
      }
    }

    // Analyze file overlap patterns to detect potential re-uploads
    const fileOverlapAnalysis = await this.analyzeFileOverlap(
      client,
      userId,
      currentFilename,
      duplicatesByUpload,
      transactions.length,
      duplicateCount
    );

    logInfo('Duplicate check completed with file overlap analysis', {
      userId,
      filename: currentFilename,
      totalTransactions: transactions.length,
      newTransactions: newTransactions.length,
      duplicates: duplicateCount,
      fileOverlapAnalysis
    });

    return {
      newTransactions,
      duplicateCount,
      duplicates,
      duplicatesByUpload,
      fileOverlapAnalysis
    };
  }

  // Analyze file overlap patterns to detect potential re-uploads or similar files
  private async analyzeFileOverlap(
    client: any,
    userId: string,
    currentFilename: string,
    duplicatesByUpload: Map<string, number>,
    totalTransactions: number,
    duplicateCount: number
  ): Promise<{
    isPotentialReupload: boolean;
    overlapPercentage: number;
    mostSimilarUpload: any;
    overlapTransactionCount: number;
  }> {
    try {
      const overlapPercentage = totalTransactions > 0 ? (duplicateCount / totalTransactions) * 100 : 0;
      let mostSimilarUpload = null;
      let maxOverlapCount = 0;

      // Find upload with highest transaction overlap
      for (const [uploadId, overlapCount] of Array.from(duplicatesByUpload.entries())) {
        if (overlapCount > maxOverlapCount) {
          maxOverlapCount = overlapCount;
          
          const uploadDetails = await client.query(`
            SELECT 
              id,
              filename,
              upload_date,
              processed_transactions,
              file_size
            FROM csv_uploads
            WHERE id = $1 AND user_id = $2
          `, [uploadId, userId]);

          if (uploadDetails.rows.length > 0) {
            mostSimilarUpload = {
              ...uploadDetails.rows[0],
              overlapCount
            };
          }
        }
      }

      // Check for exact filename matches in upload history
      const sameFilenameUploads = await client.query(`
        SELECT 
          id,
          filename,
          upload_date,
          processed_transactions,
          file_size
        FROM csv_uploads
        WHERE user_id = $1 
          AND filename = $2
        ORDER BY upload_date DESC
        LIMIT 5
      `, [userId, currentFilename]);

      // Determine re-upload probability based on overlap metrics
      const isPotentialReupload = 
        overlapPercentage >= 30 || // 30%+ duplicate transactions
        sameFilenameUploads.rows.length > 0 || // Same filename uploaded before
        (mostSimilarUpload && mostSimilarUpload.overlapCount >= Math.min(10, totalTransactions * 0.5));

      // Prioritize exact filename matches for similarity detection
      if (sameFilenameUploads.rows.length > 0 && (!mostSimilarUpload || sameFilenameUploads.rows[0].upload_date > mostSimilarUpload.upload_date)) {
        mostSimilarUpload = {
          ...sameFilenameUploads.rows[0],
          overlapCount: maxOverlapCount,
          isExactFilenameMatch: true
        };
      }

      return {
        isPotentialReupload,
        overlapPercentage,
        mostSimilarUpload,
        overlapTransactionCount: duplicateCount
      };
    } catch (error) {
      logError('Error analyzing file overlap', error);
      return {
        isPotentialReupload: false,
        overlapPercentage: 0,
        mostSimilarUpload: null,
        overlapTransactionCount: 0
      };
    }
  }

  // Analyze duplicate transaction patterns for user feedback
  private analyzeDuplicatePatterns(duplicates: any[]): {
    sameDay: number;
    sameAmount: number;
    exactMatch: number;
    categories: { [key: string]: number };
  } {
    const analysis = {
      sameDay: 0,
      sameAmount: 0,
      exactMatch: duplicates.length,
      categories: {} as { [key: string]: number }
    };

    // Group duplicates by date to identify same-day patterns
    const dateGroups = duplicates.reduce((groups, dup) => {
      const date = dup.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(dup);
      return groups;
    }, {} as { [key: string]: any[] });

    analysis.sameDay = Object.keys(dateGroups).length;

    // Analyze unique amount patterns
    const amounts = duplicates.map(d => d.amount);
    analysis.sameAmount = new Set(amounts).size;

    return analysis;
  }

  // Upload and process CSV file with comprehensive duplicate prevention
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

      logInfo('CSV upload started with duplicate prevention', {
        userId,
        filename: file.originalname,
        size: file.size,
        uploadId
      });

      await client.query('BEGIN');

      // Create upload record with processing status
      await client.query(`
        INSERT INTO csv_uploads (id, user_id, filename, file_size, status)
        VALUES ($1, $2, $3, $4, 'processing')
      `, [uploadId, userId, file.originalname, file.size]);

      // Process CSV file and extract transaction data
      const csvContent = fs.readFileSync(file.path, 'utf8');
      const processedData = await csvProcessingService.processCSV(csvContent);

      logInfo('CSV processed successfully', {
        userId,
        uploadId,
        transactionCount: processedData.transactions.length,
        categories: Object.keys(processedData.categoryBreakdown.ai).length,
        dateRange: processedData.summary.dateRange
      });

      // Run comprehensive duplicate detection with file overlap analysis
      const duplicateCheckResult = await this.checkForDuplicates(
        client,
        userId,
        processedData.transactions,
        file.originalname
      );

      // Analyze duplicate patterns for detailed user feedback
      const duplicateAnalysis = this.analyzeDuplicatePatterns(duplicateCheckResult.duplicates);

      // Insert only new transactions with error tracking
      let insertedCount = 0;
      const insertedTransactions = [];
      const failedInserts = [];
      
      for (const transaction of duplicateCheckResult.newTransactions) {
        try {
          const transactionId = uuidv4();
          await client.query(`
            INSERT INTO transactions (
              id, user_id, transaction_date, posted_date, card_no, 
              description, category, amount, type, csv_upload_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            transactionId,
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
          insertedTransactions.push({
            id: transactionId,
            ...transaction
          });
        } catch (error) {
          logError('Failed to insert transaction', { error, transaction });
          failedInserts.push({
            transaction,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update upload record with final results
      await client.query(`
        UPDATE csv_uploads 
        SET processed_transactions = $1, status = $2
        WHERE id = $3
      `, [
        insertedCount, 
        failedInserts.length > 0 ? 'completed_with_errors' : 'completed',
        uploadId
      ]);

      // Calculate budget impact for current month if budget exists
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
        
        // Calculate spending impact from new transactions only
        const totalSpent = duplicateCheckResult.newTransactions
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

      // Clean up temporary file
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        logError('Failed to delete uploaded file', error);
      }

      // Generate summary for new transactions only
      const enhancedSummary = {
        totalTransactions: duplicateCheckResult.newTransactions.length,
        totalDebits: duplicateCheckResult.newTransactions
          .filter(t => t.type === 'debit')
          .reduce((sum, t) => sum + t.amount, 0),
        totalCredits: duplicateCheckResult.newTransactions
          .filter(t => t.type === 'credit')
          .reduce((sum, t) => sum + t.amount, 0),
        dateRange: processedData.summary.dateRange,
        netAmount: 0
      };
      enhancedSummary.netAmount = enhancedSummary.totalCredits - enhancedSummary.totalDebits;

      // Create category breakdown for new transactions
      const newCategoryBreakdown: { [key: string]: { total: number; count: number } } = {};
      duplicateCheckResult.newTransactions.forEach(transaction => {
        if (!newCategoryBreakdown[transaction.aiCategory]) {
          newCategoryBreakdown[transaction.aiCategory] = { total: 0, count: 0 };
        }
        newCategoryBreakdown[transaction.aiCategory].total += transaction.amount;
        newCategoryBreakdown[transaction.aiCategory].count += 1;
      });

      // Generate insights with file overlap warnings
      const enhancedInsights = [];
      
      // Add file overlap warnings based on analysis
      if (duplicateCheckResult.fileOverlapAnalysis.isPotentialReupload) {
        if (duplicateCheckResult.fileOverlapAnalysis.overlapPercentage >= 80) {
          enhancedInsights.push(
            `This file appears to be a re-upload! ${duplicateCheckResult.fileOverlapAnalysis.overlapPercentage.toFixed(0)}% of transactions already exist in your account`
          );
        } else if (duplicateCheckResult.fileOverlapAnalysis.overlapPercentage >= 50) {
          enhancedInsights.push(
            `This file contains many transactions that were already uploaded (${duplicateCheckResult.fileOverlapAnalysis.overlapPercentage.toFixed(0)}% overlap)`
          );
        } else if (duplicateCheckResult.fileOverlapAnalysis.overlapPercentage >= 30) {
          enhancedInsights.push(
            `Some transactions in this file overlap with previous uploads (${duplicateCheckResult.fileOverlapAnalysis.overlapPercentage.toFixed(0)}% overlap)`
          );
        }

        // Add specific information about most similar upload
        if (duplicateCheckResult.fileOverlapAnalysis.mostSimilarUpload) {
          const similarUpload = duplicateCheckResult.fileOverlapAnalysis.mostSimilarUpload;
          const uploadDate = new Date(similarUpload.upload_date).toLocaleDateString();
          
          if (similarUpload.isExactFilenameMatch) {
            enhancedInsights.push(
              `You previously uploaded a file with the same name "${similarUpload.filename}" on ${uploadDate}`
            );
          } else {
            enhancedInsights.push(
              `Most similar previous upload: "${similarUpload.filename}" (${uploadDate}) with ${similarUpload.overlapCount} matching transactions`
            );
          }
        }
      }
      
      // Add duplicate processing insights
      if (duplicateCheckResult.duplicateCount > 0) {
        enhancedInsights.push(
          `Found ${duplicateCheckResult.duplicateCount} duplicate transactions that were automatically skipped`
        );
        
        if (duplicateCheckResult.duplicateCount === processedData.transactions.length) {
          enhancedInsights.push(
            `All transactions in this file already exist in your account - no new data was added`
          );
        } else {
          enhancedInsights.push(
            `${insertedCount} new transactions were successfully added to your account`
          );
        }

        if (duplicateAnalysis.sameDay > 1) {
          enhancedInsights.push(
            `Found duplicates across ${duplicateAnalysis.sameDay} different dates`
          );
        }
      } else {
        enhancedInsights.push(
          `All ${insertedCount} transactions were new and successfully added!`
        );
      }

      // Add original AI insights for new transactions
      if (insertedCount > 0) {
        enhancedInsights.push(...processedData.insights);
      }

      // Get previous uploads of same filename for context
      const previousUploadsResult = await client.query(`
        SELECT id, filename, upload_date, processed_transactions
        FROM csv_uploads 
        WHERE user_id = $1 AND filename = $2 AND id != $3
        ORDER BY upload_date DESC
        LIMIT 3
      `, [userId, file.originalname, uploadId]);

      // Return comprehensive response with duplicate prevention details
      const response = {
        success: true,
        message: this.generateUploadMessage(
          insertedCount, 
          duplicateCheckResult.duplicateCount, 
          processedData.transactions.length,
          previousUploadsResult.rows.length,
          duplicateCheckResult.fileOverlapAnalysis
        ),
        data: {
          uploadId,
          filename: file.originalname,
          size: file.size,
          uploadDate: new Date().toISOString(),
          processedTransactions: insertedCount,
          summary: enhancedSummary,
          categoryBreakdown: newCategoryBreakdown,
          budgetAnalysis,
          insights: enhancedInsights,
          categories: Object.keys(newCategoryBreakdown),
          
          // Comprehensive duplicate information
          duplicateInfo: {
            duplicatesFound: duplicateCheckResult.duplicateCount,
            duplicatesSkipped: duplicateCheckResult.duplicateCount,
            newTransactionsAdded: insertedCount,
            totalTransactionsInFile: processedData.transactions.length,
            duplicateDetails: duplicateCheckResult.duplicates.slice(0, 10),
            duplicateAnalysis,
            duplicatesByUpload: Object.fromEntries(duplicateCheckResult.duplicatesByUpload),
            previousUploadsOfSameFile: previousUploadsResult.rows,
            failedInserts: failedInserts.length,
            fileOverlapAnalysis: duplicateCheckResult.fileOverlapAnalysis
          }
        }
      };

      logInfo('CSV upload completed with duplicate prevention', {
        userId,
        uploadId,
        filename: file.originalname,
        totalInFile: processedData.transactions.length,
        newTransactions: insertedCount,
        duplicatesSkipped: duplicateCheckResult.duplicateCount,
        duplicateRate: ((duplicateCheckResult.duplicateCount / processedData.transactions.length) * 100).toFixed(1) + '%',
        budgetAnalysis: budgetAnalysis ? 'included' : 'no_monthly_data',
        previousUploads: previousUploadsResult.rows.length,
        failedInserts: failedInserts.length
      });

      res.json(response);

    } catch (error: any) {
      await client.query('ROLLBACK');
      logError('CSV upload error with duplicate prevention', error);

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
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        duplicateInfo: {
          duplicatesFound: 0,
          duplicatesSkipped: 0,
          newTransactionsAdded: 0,
          totalTransactionsInFile: 0,
          duplicateDetails: []
        }
      });
    } finally {
      client.release();
    }
  }

  // Generate contextual upload messages based on file overlap analysis
  private generateUploadMessage(
    insertedCount: number, 
    duplicateCount: number, 
    totalCount: number,
    previousUploadsCount: number,
    fileOverlapAnalysis: any
  ): string {
    // Handle file overlap scenarios first
    if (fileOverlapAnalysis.isPotentialReupload) {
      if (insertedCount === 0) {
        return `No new transactions added. This appears to be a re-upload of a previously processed file (${duplicateCount} duplicates found).`;
      } else if (fileOverlapAnalysis.overlapPercentage >= 50) {
        return `Processed ${insertedCount} new transactions. Warning: This file overlaps significantly with previous uploads (${fileOverlapAnalysis.overlapPercentage.toFixed(0)}% duplicates).`;
      } else {
        return `Processed ${insertedCount} new transactions. Note: Some transactions were duplicates from previous uploads (${duplicateCount} skipped).`;
      }
    }

    // Standard messaging for non-overlapping files
    if (duplicateCount === 0) {
      return `Successfully processed ${insertedCount} new transactions.`;
    }
    
    if (insertedCount === 0) {
      const fileMsg = previousUploadsCount > 0 
        ? 'This file appears to have been uploaded before.' 
        : 'All transactions already exist in your account.';
      return `No new transactions added. ${fileMsg} Found ${duplicateCount} duplicates.`;
    }
    
    const duplicatePercentage = ((duplicateCount / totalCount) * 100).toFixed(0);
    return `Successfully processed ${insertedCount} new transactions. Skipped ${duplicateCount} duplicates (${duplicatePercentage}% of file).`;
  }

  // Get detailed duplicate report for specific upload
  async getDuplicateReport(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const uploadId = req.params.id;

      // Get upload information
      const uploadResult = await this.pool.query(`
        SELECT 
          id, filename, file_size, processed_transactions, 
          upload_date, status
        FROM csv_uploads 
        WHERE id = $1 AND user_id = $2
      `, [uploadId, userId]);

      if (uploadResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found'
        });
      }

      // Get transactions from this upload
      const transactionsResult = await this.pool.query(`
        SELECT 
          transaction_date, description, category, amount, type
        FROM transactions 
        WHERE csv_upload_id = $1 AND user_id = $2
        ORDER BY transaction_date DESC
      `, [uploadId, userId]);

      res.json({
        success: true,
        data: {
          upload: uploadResult.rows[0],
          transactions: transactionsResult.rows,
          summary: {
            processedTransactions: transactionsResult.rows.length,
            totalAmount: transactionsResult.rows.reduce((sum, t) => sum + parseFloat(t.amount), 0)
          }
        }
      });

    } catch (error: any) {
      logError('Get duplicate report error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get duplicate report'
      });
    }
  }

  // Get paginated upload history
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

  // Get transactions for specific upload
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

  // Delete upload and associated transactions
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

      // Verify upload ownership
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

      // Delete transactions first due to foreign key constraint
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
}

export const uploadController = new UploadController();