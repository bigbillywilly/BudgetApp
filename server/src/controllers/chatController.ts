// server/src/controllers/chatController.ts
import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { logInfo, logError } from '../utils/logger';

// AI chat controller for financial advisory conversations
export const chatController = {
  // Process user message and generate AI response
  async sendMessage(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { message } = req.body;
      const userId = req.user.userId;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      // Generate AI response with financial context
      const aiResponse = await aiService.generateResponse(userId, message);

      // Persist conversation to database
      await aiService.saveChatMessage(
        userId, 
        message, 
        aiResponse.message, 
        aiResponse.tokensUsed
      );

      res.json({
        success: true,
        data: {
          message: aiResponse.message,
          tokensUsed: aiResponse.tokensUsed,
          context: aiResponse.context
        }
      });

      logInfo('Chat message processed', { 
        userId, 
        messageLength: message.length,
        tokensUsed: aiResponse.tokensUsed 
      });
    } catch (error: any) {
      logError('Chat controller error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to process message'
      });
    }
  },

  // Retrieve user's chat conversation history
  async getChatHistory(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const userId = req.user.userId;

      const history = await aiService.getChatHistory(userId, limit);

      res.json({
        success: true,
        data: { history }
      });
    } catch (error: any) {
      logError('Get chat history error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get chat history'
      });
    }
  },

  // Generate AI-powered financial insights for user
  async getInsights(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const insights = await aiService.generateInsights(userId);

      res.json({
        success: true,
        data: { insights }
      });
    } catch (error: any) {
      logError('Get AI insights error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to generate insights'
      });
    }
  },

  // Handle predefined quick financial questions
  async quickQuestion(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { question } = req.body;
      const userId = req.user.userId;

      // Map of predefined financial question categories
      const quickQuestions: { [key: string]: string } = {
        'emergency_fund': 'How can I create an emergency fund?',
        'debt_management': 'What\'s the best way to pay off debt?',
        'investment_advice': 'Should I start investing with my current income?',
        'budget_tips': 'How can I stick to my budget better?',
        'saving_strategies': 'What are some effective saving strategies?'
      };

      const questionText = quickQuestions[question];
      
      if (!questionText) {
        return res.status(400).json({
          success: false,
          message: 'Invalid quick question'
        });
      }

      // Generate AI response for predefined question
      const aiResponse = await aiService.generateResponse(userId, questionText);

      // Save interaction to conversation history
      await aiService.saveChatMessage(
        userId, 
        questionText, 
        aiResponse.message, 
        aiResponse.tokensUsed
      );

      res.json({
        success: true,
        data: {
          question: questionText,
          answer: aiResponse.message,
          tokensUsed: aiResponse.tokensUsed
        }
      });
    } catch (error: any) {
      logError('Quick question error', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to process quick question'
      });
    }
  }
};