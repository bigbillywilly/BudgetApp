/**
 * aiService.ts - AI-powered financial advisory service for the Budget Application
 * 
 * <description>
 *   This service provides intelligent financial advice using OpenAI's GPT models,
 *   personalized recommendations based on user financial data, chat functionality,
 *   and automated insights generation. Integrates with user data to provide contextual advice.
 * </description>
 * 
 * <component name="AIService" />
 * <returns>Singleton instance - Centralized AI service for financial advisory features</returns>
 */

import OpenAI from 'openai';
import { Pool } from 'pg';
import { db } from '../database/connection';
import { logInfo, logError } from '../utils/logger';
import { userService } from './userService';
import { analyticsService } from './analyticsService';

/* <interface>
     <name>ChatContext</name>
     <purpose>Container for user financial context used in AI responses</purpose>
   </interface> */
interface ChatContext {
  userSummary?: any;        // <field>User financial overview and statistics</field>
  recentTransactions?: any[]; // <field>Latest transaction history for context</field>
  monthlyData?: any;        // <field>Current month budget and financial data</field>
  insights?: any;           // <field>Existing financial insights and alerts</field>
}

/* <interface>
     <name>AIResponse</name>
     <purpose>Structure for AI-generated responses with metadata</purpose>
   </interface> */
interface AIResponse {
  message: string;     // <field>AI-generated response message</field>
  tokensUsed: number;  // <field>Number of tokens consumed by AI request</field>
  context?: any;       // <field>Additional context metadata for response</field>
}

/* <class>
     <name>AIService</name>
     <purpose>Centralized AI service for financial advisory and chat functionality</purpose>
     <pattern>Singleton pattern with OpenAI integration</pattern>
   </class> */
class AIService {
  // <properties>
  private openai: OpenAI;  // <field>OpenAI API client instance</field>
  private pool: Pool;      // <field>Database connection pool for data access</field>
  // </properties>

  /* <constructor>
       <purpose>Initialize AI service with OpenAI client and database connection</purpose>
       <security>Validates OpenAI API key from environment variables</security>
     </constructor> */
  constructor() {
    // <openai-initialization>
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    // </openai-initialization>
    
    this.pool = db.getPool();
  }

  /* <method>
       <name>getUserContext</name>
       <purpose>Gather comprehensive user financial context for AI responses</purpose>
       <param name="userId" type="string">User identifier for context retrieval</param>
       <returns>Promise<ChatContext> - User financial context data</returns>
       <private>Internal method for context preparation</private>
     </method> */
  private async getUserContext(userId: string): Promise<ChatContext> {
    try {
      const context: ChatContext = {};

      // <context-gathering>
      //   <user-summary>Overall financial statistics and overview</user-summary>
      context.userSummary = await userService.getUserSummary(userId);

      //   <recent-transactions>Latest 10 transactions for spending pattern analysis</recent-transactions>
      const transactionsResult = await this.pool.query(`
        SELECT transaction_date, description, category, amount, type
        FROM transactions 
        WHERE user_id = $1 
        ORDER BY transaction_date DESC 
        LIMIT 10
      `, [userId]);
      context.recentTransactions = transactionsResult.rows;

      //   <monthly-data>Current month budget configuration</monthly-data>
      const currentDate = new Date();
      const monthlyResult = await this.pool.query(`
        SELECT income, fixed_expenses, savings_goal
        FROM monthly_data 
        WHERE user_id = $1 AND month = $2 AND year = $3
      `, [userId, currentDate.getMonth() + 1, currentDate.getFullYear()]);
      
      if (monthlyResult.rows.length > 0) {
        context.monthlyData = monthlyResult.rows[0];
      }

      //   <financial-insights>Existing analytics and alerts</financial-insights>
      context.insights = await analyticsService.getFinancialInsights(userId);
      // </context-gathering>

      return context;
    } catch (error) {
      logError('Failed to get user context for AI', error);
      return {};
    }
  }

  /* <method>
       <name>generateSystemPrompt</name>
       <purpose>Create personalized system prompt with user financial context</purpose>
       <param name="context" type="ChatContext">User financial context data</param>
       <returns>string - Formatted system prompt for AI model</returns>
       <private>Internal method for prompt engineering</private>
     </method> */
  private generateSystemPrompt(context: ChatContext): string {
    const { userSummary, monthlyData, insights } = context;
    
    // <base-prompt>
    //   <role>Financial advisor AI assistant for MoneyWise app</role>
    //   <guidelines>Professional, encouraging, and actionable advice</guidelines>
    // </base-prompt>
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

    // <context-integration>
    //   <user-overview>Financial statistics and performance metrics</user-overview>
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

    //   <current-budget>Monthly budget allocation and available funds</current-budget>
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

    //   <active-alerts>Current financial alerts and warnings</active-alerts>
    if (insights && insights.alerts && insights.alerts.length > 0) {
      prompt += `
Current Alerts: ${insights.alerts.join(', ')}
`;
    }
    // </context-integration>

    return prompt;
  }

  /* <method>
       <name>generateResponse</name>
       <purpose>Generate AI response to user message with financial context</purpose>
       <param name="userId" type="string">User identifier for personalization</param>
       <param name="userMessage" type="string">User's question or message</param>
       <returns>Promise<AIResponse> - AI-generated response with metadata</returns>
       <async>Uses OpenAI API for response generation</async>
     </method> */
  async generateResponse(userId: string, userMessage: string): Promise<AIResponse> {
    try {
      // <validation>
      if (!userMessage || userMessage.trim().length === 0) {
        throw new Error('User message is required for AI response generation');
      }
      // </validation>

      // <context-preparation>
      //   <user-data>Gather comprehensive financial context</user-data>
      const context = await this.getUserContext(userId);
      
      //   <prompt-engineering>Create personalized system prompt</prompt-engineering>
      const systemPrompt = this.generateSystemPrompt(context);
      // </context-preparation>

      // <openai-api-call>
      //   <model>GPT-3.5-turbo for cost-effective responses</model>
      //   <parameters>Balanced temperature and token limits</parameters>
      // </openai-api-call>
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

      // <response-processing>
      const response = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
      const tokensUsed = completion.usage?.total_tokens || 0;
      // </response-processing>

      // <return-format>
      //   <message>AI-generated response text</message>
      //   <metadata>Token usage and context information</metadata>
      // </return-format>
      return {
        message: response,
        tokensUsed,
        context: {
          hasMonthlyData: !!context.monthlyData,
          transactionCount: context.recentTransactions?.length || 0,
          hasInsights: !!(context.insights && context.insights.insights && context.insights.insights.length > 0)
        }
      };
    } catch (error) {
      logError('AI service error', error);
      
      // <fallback-response>
      //   <purpose>Graceful degradation when AI service fails</purpose>
      //   <user-experience>Maintains functionality despite technical issues</user-experience>
      // </fallback-response>
      return {
        message: "I'm experiencing some technical difficulties right now. Please try again later, or feel free to explore your financial dashboard in the meantime!",
        tokensUsed: 0
      };
    }
  }

  /* <method>
       <name>saveChatMessage</name>
       <purpose>Persist chat conversation to database for history tracking</purpose>
       <param name="userId" type="string">User identifier for message ownership</param>
       <param name="userMessage" type="string">Original user message</param>
       <param name="aiResponse" type="string">AI-generated response</param>
       <param name="tokensUsed" type="number">Token consumption for cost tracking</param>
       <returns>Promise<void> - Completion of database operation</returns>
       <async>Database transaction with rollback capability</async>
     </method> */
  async saveChatMessage(
    userId: string, 
    userMessage: string, 
    aiResponse: string, 
    tokensUsed: number
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // <database-transaction>
      //   <isolation>Ensures data consistency for chat history</isolation>
      await client.query('BEGIN');

      //   <user-message-storage>Save original user message</user-message-storage>
      await client.query(`
        INSERT INTO chat_messages (user_id, message, response, message_type, tokens_used)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, userMessage, '', 'user', 0]);

      //   <ai-response-storage>Save AI response with token usage</ai-response-storage>
      await client.query(`
        INSERT INTO chat_messages (user_id, message, response, message_type, tokens_used)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, '', aiResponse, 'assistant', tokensUsed]);

      await client.query('COMMIT');
      // </database-transaction>
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Failed to save chat message', error);
      // <error-handling>
      //   <non-blocking>Don't throw error to avoid disrupting user experience</non-blocking>
      //   <logging>Log error for monitoring and debugging</logging>
      // </error-handling>
    } finally {
      client.release();
    }
  }

  /* <method>
       <name>getChatHistory</name>
       <purpose>Retrieve user's chat conversation history</purpose>
       <param name="userId" type="string">User identifier for history retrieval</param>
       <param name="limit" type="number" default="20">Maximum number of messages to retrieve</param>
       <returns>Promise<any[]> - Array of chat messages with timestamps</returns>
       <async>Database query with result formatting</async>
     </method> */
  async getChatHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      // <validation>
      if (limit <= 0 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }
      // </validation>

      // <database-query>
      //   <ordering>Most recent messages first, then reversed for chronological display</ordering>
      //   <limiting>Prevent excessive data retrieval</limiting>
      // </database-query>
      const result = await this.pool.query(`
        SELECT message, response, message_type, created_at
        FROM chat_messages 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, limit]);

      // <result-formatting>
      //   <chronological>Reverse order for natural conversation flow</chronological>
      //   <structure>Unified message format for both user and AI messages</structure>
      // </result-formatting>
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

  /* <method>
       <name>generateInsights</name>
       <purpose>Generate AI-powered financial insights based on user data</purpose>
       <param name="userId" type="string">User identifier for personalized insights</param>
       <returns>Promise<string[]> - Array of actionable financial insights</returns>
       <async>Uses OpenAI API for insight generation</async>
     </method> */
  async generateInsights(userId: string): Promise<string[]> {
    try {
      // <context-preparation>
      const context = await this.getUserContext(userId);
      
      if (!context.userSummary) {
        return ["Start tracking your income and expenses to get personalized insights!"];
      }
      // </context-preparation>

      // <prompt-engineering>
      //   <format>Structured request for JSON array response</format>
      //   <specificity>Request for actionable, practical insights</specificity>
      // </prompt-engineering>
      const prompt = `Based on this user's financial data, provide 3-5 brief, actionable insights:
      
${JSON.stringify(context, null, 2)}

Format as an array of strings, each insight being one practical tip or observation.`;

      // <openai-api-call>
      //   <model>GPT-3.5-turbo for cost-effective insights</model>
      //   <temperature>Lower temperature for more focused responses</temperature>
      // </openai-api-call>
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
      
      // <response-parsing>
      //   <json-parsing>Attempt to parse structured response</json-parsing>
      //   <fallback>Graceful degradation if parsing fails</fallback>
      // </response-parsing>
      try {
        return JSON.parse(response || '[]');
      } catch {
        // Fallback if JSON parsing fails
        return [response || "Keep tracking your expenses for better insights!"];
      }
    } catch (error) {
      logError('Failed to generate AI insights', error);
      return ["Continue tracking your finances to unlock personalized insights!"];
    }
  }
}

/* <export>
     <pattern>Singleton export pattern</pattern>
     <purpose>Ensures consistent AI service instance across application</purpose>
     <usage>Import and use directly without instantiation</usage>
   </export> */
export const aiService = new AIService();
