import { Router } from 'express';
import multer from 'multer';
import { csvProcessingService } from '../services/csvProcessingService';

const router = Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// POST /api/upload/csv
router.post('/csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const processedData = await csvProcessingService.processCSV(csvContent);

    // Generate additional insights specific to this CSV format
    const categoryComparison = csvProcessingService.getCategoryComparison(processedData.transactions);
    const spendingByCategory = csvProcessingService.getSpendingByCategory(processedData.transactions);

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
        ...processedData,
        aiAnalysis: {
          categoriesImproved: categoryComparison.improved,
          categoriesUnchanged: categoryComparison.unchanged,
          improvementRate: `${((categoryComparison.improved / categoryComparison.total) * 100).toFixed(1)}%`,
          topSpendingCategories: Object.entries(spendingByCategory)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, amount]) => ({ category, amount: parseFloat(amount.toFixed(2)) }))
        }
      }
    });
  } catch (error) {
    console.error('CSV processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'CSV processing failed'
    });
  }
});

// GET /api/upload/sample-format
router.get('/sample-format', (req, res) => {
  res.json({
    success: true,
    data: {
      expectedColumns: [
        'Transaction Date',
        'Posted Date', 
        'Card No.',
        'Description',
        'Category',
        'Debit',
        'Credit'
      ],
      sampleRow: {
        'Transaction Date': '07/10/2025',
        'Posted Date': '07/11/2025',
        'Card No.': '1234',
        'Description': 'STARBUCKS STORE #12345',
        'Category': 'Restaurants',
        'Debit': '5.67',
        'Credit': ''
      },
      notes: [
        'Dates can be in MM/DD/YYYY or other common formats',
        'Debit represents money spent (outgoing)',
        'Credit represents money received (incoming)',
        'Either Debit or Credit will have a value, not both',
        'AI will recategorize transactions for better insights'
      ]
    }
  });
});

export default router;