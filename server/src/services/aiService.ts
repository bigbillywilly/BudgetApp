// server/src/services/aiService.ts
import OpenAI from 'openai';
import { Pool } from 'pg';
import { db } from '../database/connection';
import { logInfo, logError, logWarn } from '../utils/logger';
import { userService } from './userService';
import { analyticsService } from './analyticsService';

interface ChatContext {
  userSummary?: any;
  recentTransactions?: any[];
  monthlyData?: any;
  insights?: any;
}

interface AIResponse {
  message: string;
  tokensUsed: number;
  context?: any;
}

// AI service for generating financial advice and insights using OpenAI
class AIService {
  private openai: OpenAI | null;
  private pool: Pool;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!process.env.OPENAI_API_KEY;
    if (this.isEnabled) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      this.openai = null;
      logWarn('OpenAI API key not provided - AI features will be disabled');
    }
    this.pool = db.getPool();
  }

  // Aggregate user context for AI prompt generation
  private async getUserContext(userId: string): Promise<ChatContext> {
    try {
      const context: ChatContext = {};
      context.userSummary = await userService.getUserSummary(userId);

      // Fetch last 10 transactions
      const transactionsResult = await this.pool.query(`
        SELECT transaction_date, description, category, amount, type
        FROM transactions 
        WHERE user_id = $1 
        ORDER BY transaction_date DESC 
        LIMIT 10
      `, [userId]);
      context.recentTransactions = transactionsResult.rows;

      // Fetch current month budget data
      const currentDate = new Date();
      const monthlyResult = await this.pool.query(`
        SELECT income, fixed_expenses, savings_goal
        FROM monthly_data 
        WHERE user_id = $1 AND month = $2 AND year = $3
      `, [userId, currentDate.getMonth() + 1, currentDate.getFullYear()]);
      if (monthlyResult.rows.length > 0) {
        context.monthlyData = monthlyResult.rows[0];
      }

      // Fetch financial insights
      context.insights = await analyticsService.getFinancialInsights(userId);

      return context;
    } catch (error) {
      logError('Failed to get user context for AI', error);
      return {};
    }
  }

  // Generate system prompt for OpenAI using user context
  private generateSystemPrompt(context: ChatContext): string {
    const { userSummary, monthlyData, insights } = context;
    let prompt = `You are a helpful financial advisor AI assistant for MoneyWise, a personal finance tracking app. 

Your role is to provide personalized financial advice, budgeting tips, and insights based on the user's financial data.

Key guidelines:
- Be encouraging and supportive
- Provide actionable, specific advice
- Use the user's actual financial data in your responses when relevant
- Keep responses concise but helpful
- Focus on practical budgeting, saving, and spending strategies
- Don't provide investment advice beyond basic concepts
- Always be positive and motivating

`;

    if (userSummary) {
      prompt += `
User Financial Overview:
- Total Income: $${userSummary.stats.totalIncome.toFixed(2)}
- Total Expenses: $${userSummary.stats.totalExpenses.toFixed(2)}
- Net Worth: $${userSummary.stats.netWorth.toFixed(2)}
- Months Tracked: ${userSummary.stats.totalMonths}
- Total Transactions: ${userSummary.stats.totalTransactions}
`;
    }

    if (monthlyData) {
      const availableToSpend = parseFloat(monthlyData.income) - parseFloat(monthlyData.fixed_expenses) - parseFloat(monthlyData.savings_goal);
      prompt += `
Current Month Budget:
- Income: $${parseFloat(monthlyData.income).toFixed(2)}
- Fixed Expenses: $${parseFloat(monthlyData.fixed_expenses).toFixed(2)}
- Savings Goal: $${parseFloat(monthlyData.savings_goal).toFixed(2)}
- Available to Spend: $${availableToSpend.toFixed(2)}
`;
    }

    if (insights && insights.alerts && insights.alerts.length > 0) {
      prompt += `
Current Alerts: ${insights.alerts.join(', ')}
`;
    }

    return prompt;
  }

  // Generate AI response for user message
  async generateResponse(userId: string, userMessage: string): Promise<AIResponse> {
    try {
      if (!this.isEnabled || !this.openai) {
        return {
          message: "I'm sorry, but AI features are currently unavailable. The OpenAI API key is not configured. You can still track your finances manually using the dashboard!",
          tokensUsed: 0
        };
      }

      const context = await this.getUserContext(userId);
      const systemPrompt = this.generateSystemPrompt(context);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
      const tokensUsed = completion.usage?.total_tokens || 0;

      return {
        message: response,
        tokensUsed,
        context: {
          hasMonthlyData: !!context.monthlyData,
          transactionCount: context.recentTransactions?.length || 0,
          hasInsights: !!(context.insights && context.insights.insights.length > 0)
        }
      };
    } catch (error) {
      logError('AI service error', error);
      return {
        message: "I'm experiencing some technical difficulties right now. Please try again later, or feel free to explore your financial dashboard in the meantime!",
        tokensUsed: 0
      };
    }
  }

  // Persist chat messages and AI responses for analytics and history
  async saveChatMessage(
    userId: string, 
    userMessage: string, 
    aiResponse: string, 
    tokensUsed: number
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO chat_messages (user_id, message, response, message_type, tokens_used)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, userMessage, '', 'user', 0]);
      await client.query(`
        INSERT INTO chat_messages (user_id, message, response, message_type, tokens_used)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, '', aiResponse, 'assistant', tokensUsed]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Failed to save chat message', error);
    } finally {
      client.release();
    }
  }

  // Retrieve chat history for user
  async getChatHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT message, response, message_type, created_at
        FROM chat_messages 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, limit]);

      return result.rows.reverse().map(row => ({
        message: row.message_type === 'user' ? row.message : row.response,
        type: row.message_type,
        timestamp: row.created_at
      }));
    } catch (error) {
      logError('Failed to get chat history', error);
      return [];
    }
  }

  // Generate financial insights using AI or fallback logic
  async generateInsights(userId: string): Promise<string[]> {
    try {
      if (!this.isEnabled || !this.openai) {
        const context = await this.getUserContext(userId);
        if (!context.userSummary) {
          return ["Start tracking your income and expenses to get personalized insights!"];
        }
        const basicInsights = [];
        const { totalIncome, totalExpenses, netWorth } = context.userSummary.stats;
        if (netWorth > 0) {
          basicInsights.push("Great job! You're spending less than you earn.");
        } else {
          basicInsights.push("Consider reviewing your expenses to improve your financial health.");
        }
        if (totalIncome > 0) {
          const expenseRatio = (totalExpenses / totalIncome) * 100;
          if (expenseRatio > 80) {
            basicInsights.push("Your expenses are quite high relative to income. Look for areas to cut back.");
          } else if (expenseRatio < 50) {
            basicInsights.push("You're doing well at keeping expenses low relative to income!");
          }
        }
        basicInsights.push("Upload your bank statements to get more detailed spending insights.");
        return basicInsights;
      }

      const context = await this.getUserContext(userId);
      if (!context.userSummary) {
        return ["Start tracking your income and expenses to get personalized insights!"];
      }

      const prompt = `Based on this user's financial data, provide 3-5 brief, actionable insights:
      
${JSON.stringify(context, null, 2)}

Format as an array of strings, each insight being one practical tip or observation.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a financial advisor. Provide brief, actionable insights in JSON array format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      const response = completion.choices[0].message.content;
      try {
        return JSON.parse(response || '[]');
      } catch {
        return [response || "Keep tracking your expenses for better insights!"];
      }
    } catch (error) {
      logError('Failed to generate AI insights', error);
      return ["Continue tracking your finances to unlock personalized insights!"];
    }
  }
}

export const aiService = new AIService();