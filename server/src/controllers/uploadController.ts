// server/src/controllers/uploadController.ts - FIXED PARAMETER NAMES
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

      // For now, just return success without database operations
      // TODO: Implement actual database operations when DB is set up
      res.json({
        success: true,
        message: 'CSV file uploaded successfully',
        data: {
          uploadId,
          filename: file.originalname,
          size: file.size,
          uploadDate: new Date().toISOString()
        }
      });

    } catch (error: any) {
      logError('CSV upload error', error);

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

      // Return empty array for now
      // TODO: Implement with actual database
      res.json({
        success: true,
        data: {
          uploads: [],
          pagination: {
            total: 0,
            limit: 10,
            offset: 0,
            hasMore: false
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

  // GET /api/upload/:uploadId/transactions - FIXED PARAMETER NAME
  async getUploadTransactions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const uploadId = req.params.uploadId; // FIXED: now matches route parameter

      // Return empty array for now
      // TODO: Implement with actual database
      res.json({
        success: true,
        data: {
          uploadId,
          transactions: []
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

  // DELETE /api/upload/:uploadId - FIXED PARAMETER NAME  
  async deleteUpload(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const uploadId = req.params.uploadId; // FIXED: now matches route parameter

      // TODO: Implement with actual database
      res.json({
        success: true,
        message: 'Upload deleted successfully',
        data: {
          uploadId,
          deletedTransactions: 0
        }
      });

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