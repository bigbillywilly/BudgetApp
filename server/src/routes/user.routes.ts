import { Router, Request, Response } from 'express';

const router = Router();

// Mock data for now (since no database)
let mockUserData = {
  currentMonth: {
    income: '',
    fixedExpenses: '',
    savingsGoal: '',
    lastUpdated: new Date().toISOString()
  },
  historicalData: {} as Record<string, any>
};

// GET /api/user/monthly-data/current
router.get('/monthly-data/current', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockUserData.currentMonth
  });
});

// POST /api/user/monthly-data
router.post('/monthly-data', (req: Request, res: Response) => {
  const { income, fixedExpenses, savingsGoal } = req.body;
  
  // Validate required fields
  if (income === undefined || fixedExpenses === undefined || savingsGoal === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: income, fixedExpenses, savingsGoal'
    });
  }

  // Update mock data
  mockUserData.currentMonth = {
    income: income.toString(),
    fixedExpenses: fixedExpenses.toString(),
    savingsGoal: savingsGoal.toString(),
    lastUpdated: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Monthly data updated successfully',
    data: mockUserData.currentMonth
  });
});

// GET /api/user/monthly-data/all
router.get('/monthly-data/all', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockUserData.historicalData
  });
});

export default router;