// server/src/controllers/userController.ts
import { Request, Response } from 'express';
import { userService } from '../services/userService';
import { analyticsService } from '../services/analyticsService';
import { logInfo, logError } from '../utils/logger';

export const userController = {
  // GET /api/users/summary
  async getUserSummary(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const summary = await userService.getUserSummary(userId);

      res.json({
        success: true,
        data: { summary }
      });
    } catch (error: any) {
      logError('Get user summary error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get user summary'
      });
    }
  },

  // GET /api/users/monthly-breakdown
  async getMonthlyBreakdown(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      const breakdown = await userService.getMonthlyBreakdown(userId, year);

      res.json({
        success: true,
        data: { breakdown }
      });
    } catch (error: any) {
      logError('Get monthly breakdown error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get monthly breakdown'
      });
    }
  },

  // GET /api/users/budget-analysis
  async getBudgetAnalysis(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);

      if (!month || !year) {
        return res.status(400).json({
          success: false,
          message: 'Month and year are required'
        });
      }

      const analysis = await analyticsService.getBudgetAnalysis(userId, month, year);

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'No budget data found for the specified month'
        });
      }

      res.json({
        success: true,
        data: { analysis }
      });
    } catch (error: any) {
      logError('Get budget analysis error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get budget analysis'
      });
    }
  },

  // GET /api/users/insights
  async getInsights(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const insights = await analyticsService.getFinancialInsights(userId);

      res.json({
        success: true,
        data: { insights }
      });
    } catch (error: any) {
      logError('Get insights error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get insights'
      });
    }
  },

  // DELETE /api/users/account
  async deleteAccount(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      
      // This is a destructive action, so we might want additional verification
      const { confirmDelete } = req.body;
      
      if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
        return res.status(400).json({
          success: false,
          message: 'Please confirm account deletion by sending confirmDelete: "DELETE_MY_ACCOUNT"'
        });
      }

      await userService.deleteUserAccount(userId);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error: any) {
      logError('Delete account error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }
};