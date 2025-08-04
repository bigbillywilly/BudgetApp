/**
 * Financial data types for budget tracking application
 */

// Monthly budget configuration and spending targets
export interface MonthlyData {
  id: string;
  month: number; // 1-12
  year: number;
  income: number;
  fixed_expenses: number;
  savings_goal: number;
  created_at: string;
  updated_at: string;
}

// Individual financial transaction record
export interface Transaction {
  id: string;
  transaction_date: string;
  posted_date?: string;
  card_no?: string;
  description: string;
  category: string;
  amount: number; // Positive: income, negative: expense
  type: 'income' | 'expense';
  created_at: string;
  updated_at: string;
}

// Transaction category for spending classification
export interface TransactionCategory {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}
