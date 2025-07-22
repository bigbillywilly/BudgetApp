// server/src/models/MonthlyData.ts
export interface MonthlyData {
  id: string;
  user_id: string;
  month: number;
  year: number;
  income: number;
  fixed_expenses: number;
  savings_goal: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMonthlyData {
  user_id: string;
  month: number;
  year: number;
  income: number;
  fixed_expenses: number;
  savings_goal: number;
}

export interface UpdateMonthlyData {
  income?: number;
  fixed_expenses?: number;
  savings_goal?: number;
}