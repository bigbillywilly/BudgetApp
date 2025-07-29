// client/src/context/BudgetContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

interface MonthlyBudget {
  month: number;
  year: number;
  income: number;
  fixedExpenses: number;
  savingsGoal: number;
  availableToSpend: number;
  hasSetBudget: boolean;
}

interface BudgetContextType {
  budget: MonthlyBudget;
  isLoading: boolean;
  updateBudget: (data: {
    income: number;
    fixedExpenses: number;
    savingsGoal: number;
  }) => Promise<{ success: boolean; error?: string }>;
  refreshBudget: () => Promise<void>;
  calculateAvailableToSpend: () => number;
}

// Create context
const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

// Provider Props
interface BudgetProviderProps {
  children: ReactNode;
}

// Budget Provider component
const BudgetProvider: React.FC<BudgetProviderProps> = ({ children }) => {
  const [budget, setBudget] = useState<MonthlyBudget>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    income: 0,
    fixedExpenses: 0,
    savingsGoal: 0,
    availableToSpend: 0,
    hasSetBudget: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Load budget data on mount
  useEffect(() => {
    loadBudgetData();
  }, []);

  // Calculate available to spend
  const calculateAvailableToSpend = () => {
    return budget.income - budget.fixedExpenses - budget.savingsGoal;
  };

  // Load budget data from API
  const loadBudgetData = async () => {
    try {
      console.log('💰 Loading budget data...');
      setIsLoading(true);
      
      const response = await apiService.getCurrentMonthData();
      
      if (response.success && response.data) {
        const data = response.data;
        const availableToSpend = data.income - data.fixedExpenses - data.savingsGoal;
        const hasSetBudget = data.income > 0;
        
        setBudget({
          month: data.month,
          year: data.year,
          income: data.income,
          fixedExpenses: data.fixedExpenses,
          savingsGoal: data.savingsGoal,
          availableToSpend,
          hasSetBudget,
        });
        
        console.log('✅ Budget data loaded:', {
          income: data.income,
          availableToSpend,
          hasSetBudget
        });
      } else {
        console.log('ℹ️ No budget data found, using defaults');
        // Keep default state for new users
      }
    } catch (error) {
      console.error('❌ Failed to load budget data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update budget data
  const updateBudget = async (data: {
    income: number;
    fixedExpenses: number;
    savingsGoal: number;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('💰 Updating budget data:', data);
      
      const response = await apiService.updateCurrentMonthData(data);
      
      if (response.success && response.data) {
        const updatedData = response.data;
        const availableToSpend = updatedData.income - updatedData.fixedExpenses - updatedData.savingsGoal;
        
        setBudget({
          month: updatedData.month,
          year: updatedData.year,
          income: updatedData.income,
          fixedExpenses: updatedData.fixedExpenses,
          savingsGoal: updatedData.savingsGoal,
          availableToSpend,
          hasSetBudget: true,
        });
        
        console.log('✅ Budget updated successfully:', {
          income: updatedData.income,
          availableToSpend
        });
        
        return { success: true };
      } else {
        console.error('❌ Budget update failed:', response.error);
        return { success: false, error: response.error || 'Failed to update budget' };
      }
    } catch (error) {
      console.error('❌ Budget update error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Refresh budget data (useful after uploads or changes)
  const refreshBudget = async () => {
    await loadBudgetData();
  };

  // Context value
  const contextValue: BudgetContextType = {
    budget,
    isLoading,
    updateBudget,
    refreshBudget,
    calculateAvailableToSpend,
  };

  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
};

// Custom hook to use budget context
export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  
  return context;
};

// Export the context itself (optional, for advanced use cases)
export { BudgetContext };

// Default export
export default BudgetProvider;