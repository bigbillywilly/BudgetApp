// Budget context for managing monthly budget data across the application
// Handles income, expenses, savings goals, and available spending calculations
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

// Monthly budget data structure with calculated fields
interface MonthlyBudget {
  month: number;
  year: number;
  income: number;
  fixedExpenses: number;
  savingsGoal: number;
  availableToSpend: number;
  hasSetBudget: boolean;
}

// Budget context interface defining available methods and state
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

// Create budget context with undefined initial value for type safety
const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

// Provider component props interface
interface BudgetProviderProps {
  children: ReactNode;
}

// BudgetProvider component - manages budget state and provides context to children
const BudgetProvider: React.FC<BudgetProviderProps> = ({ children }) => {
  // Initialize budget state with current month/year defaults
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

  // Load budget data on component mount
  useEffect(() => {
    loadBudgetData();
  }, []);

  // Calculate available spending amount based on budget formula
  const calculateAvailableToSpend = () => {
    return budget.income - budget.fixedExpenses - budget.savingsGoal;
  };

  // Load current month's budget data from API
  const loadBudgetData = async () => {
    try {
      console.log('Loading budget data for current month...');
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
        
        console.log('Budget data loaded successfully:', {
          income: data.income,
          availableToSpend,
          hasSetBudget
        });
      } else {
        console.log('No existing budget found, using default values for new user');
        // Keep default state for new users who haven't set up budget yet
      }
    } catch (error) {
      console.error('Failed to load budget data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update budget data with new income, expenses, and savings values
  const updateBudget = async (data: {
    income: number;
    fixedExpenses: number;
    savingsGoal: number;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Updating budget with new data:', data);
      
      const response = await apiService.updateCurrentMonthData(data);
      
      if (response.success && response.data) {
        const updatedData = response.data;
        const availableToSpend = updatedData.income - updatedData.fixedExpenses - updatedData.savingsGoal;
        
        // Update local state with calculated values
        setBudget({
          month: updatedData.month,
          year: updatedData.year,
          income: updatedData.income,
          fixedExpenses: updatedData.fixedExpenses,
          savingsGoal: updatedData.savingsGoal,
          availableToSpend,
          hasSetBudget: true,
        });
        
        console.log('Budget updated successfully:', {
          income: updatedData.income,
          availableToSpend
        });
        
        return { success: true };
      } else {
        console.error('Budget update failed:', response.error);
        return { success: false, error: response.error || 'Failed to update budget' };
      }
    } catch (error) {
      console.error('Budget update error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Refresh budget data from server (useful after transaction uploads or external changes)
  const refreshBudget = async () => {
    await loadBudgetData();
  };

  // Create context value object with current budget state and methods
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

// Custom hook for accessing budget context with error checking
export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  
  return context;
};

// Export the context itself for advanced use cases
export { BudgetContext };

// Default export for Hot Module Replacement compatibility
export default BudgetProvider;