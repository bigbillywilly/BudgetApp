// Monthly budget data model for user financial planning
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

// DTO for creating a new monthly budget entry
export interface CreateMonthlyData {
  user_id: string;
  month: number;
  year: number;
  income: number;
  fixed_expenses: number;
  savings_goal: number;
}

// DTO for updating monthly budget fields (partial update)
export interface UpdateMonthlyData {
  income?: number;
  fixed_expenses?: number;
  savings_goal?: number;
}