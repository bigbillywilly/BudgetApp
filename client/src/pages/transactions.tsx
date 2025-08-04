// Monthly transactions page for viewing and managing financial transactions by month
// Provides transaction filtering, budget progress tracking, and manual transaction entry
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Download, Plus, TrendingUp, TrendingDown, DollarSign, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBudget } from '../context/budgetContext';
import { apiService, Transaction } from '../services/api';

// Unified spending categories matching CSV upload categorization system
const SPENDING_CATEGORIES = {
  'Essential Spending': [
    'Grocery',
    'Health', 
    'Wifi / Utilities',
    'Household',
    'Laundry'
  ],
  'Transportation': [
    'Rideshare',
    'Travel'
  ],
  'Food & Drinks': [
    'Dining',
    'Drinks/Dessert',
    'Alcohol'
  ],
  'Lifestyle': [
    'Fashion',
    'Beauty',
    'Gym',
    'Entertainment',
    'Subscription'
  ],
  'Financial': [
    'Credit',
    'Income'
  ],
  'Shopping & Gifts': [
    'Merchandise',
    'Gifts'
  ],
  'Other': [
    'Other'
  ]
};

// Flattened array of all available categories for form dropdowns
const ALL_CATEGORIES = Object.values(SPENDING_CATEGORIES).flat();

// Filter interface for transaction search and categorization
interface TransactionFilters {
  category?: string;
  type?: string;
  search?: string;
}

// Month/year selection structure for transaction viewing
interface MonthYear {
  month: number;
  year: number;
  label: string;
  key: string;
}

// Month selector component with navigation arrows and dropdown
const MonthSelector: React.FC<{
  selectedMonth: MonthYear;
  onMonthChange: (month: MonthYear) => void;
  availableMonths: MonthYear[];
}> = ({ selectedMonth, onMonthChange, availableMonths }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position for portal rendering to avoid z-index issues
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left - 30
        });
      }
    };

    if (isOpen) {
      updatePosition();
      // Update position on scroll and resize to maintain alignment
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside the component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Navigate between available months with boundary checking
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentIndex = availableMonths.findIndex(m => m.key === selectedMonth.key);
    if (direction === 'prev' && currentIndex < availableMonths.length - 1) {
      onMonthChange(availableMonths[currentIndex + 1]); // Go to older month
    } else if (direction === 'next' && currentIndex > 0) {
      onMonthChange(availableMonths[currentIndex - 1]); // Go to newer month
    }
  };

  // Determine navigation button availability based on current position
  const canNavigatePrev = availableMonths.findIndex(m => m.key === selectedMonth.key) < availableMonths.length - 1;
  const canNavigateNext = availableMonths.findIndex(m => m.key === selectedMonth.key) > 0;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Calendar className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Transaction Month</h3>
            <p className="text-sm text-gray-600">View transactions for a specific month</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Navigation to previous month (older) */}
          <button
            onClick={() => navigateMonth('prev')}
            disabled={!canNavigatePrev}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Go to previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Month dropdown with portal rendering for proper z-index layering */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setIsOpen(!isOpen)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors min-w-[140px] text-center"
            >
              {selectedMonth.label}
            </button>

            {/* Portal-rendered dropdown to escape stacking context limitations */}
            {isOpen && createPortal(
              <div 
                ref={dropdownRef}
                className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto w-[160px]"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  zIndex: 999999
                }}
              >
                {availableMonths.map((month) => (
                  <button
                    key={month.key}
                    onClick={() => {
                      onMonthChange(month);
                      setIsOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left hover:bg-blue-50 transition-colors text-sm ${
                      month.key === selectedMonth.key ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {month.label}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>

          {/* Navigation to next month (newer) */}
          <button
            onClick={() => navigateMonth('next')}
            disabled={!canNavigateNext}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Go to next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick month statistics and status indicators */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-sm text-gray-600">Month</div>
          <div className="font-bold text-blue-600">{selectedMonth.label}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">Year</div>
          <div className="font-bold text-gray-900">{selectedMonth.year}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">Status</div>
          <div className="font-bold text-green-600">
            {selectedMonth.month === new Date().getMonth() + 1 && selectedMonth.year === new Date().getFullYear() 
              ? 'Current' : 'Historical'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal for manually adding new transactions with unified category system
const AddTransactionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
  selectedMonth: MonthYear;
}> = ({ isOpen, onClose, onTransactionAdded, selectedMonth }) => {
  // Form state with default date set to selected month
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    date: `${selectedMonth.year}-${selectedMonth.month.toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission with validation and API call
  const handleSubmit = async () => {
    if (!formData.description || !formData.category || !formData.amount) {
      alert('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const transactionData = {
        date: formData.date,
        description: formData.description,
        category: formData.category,
        amount: parseFloat(formData.amount),
        type: formData.type
      };

      const response = await apiService.createTransaction(transactionData);
      
      if (response.success) {
        onTransactionAdded(); // Refresh transaction list
        onClose();
        // Reset form to default state
        setFormData({
          description: '',
          category: '',
          amount: '',
          type: 'expense',
          date: `${selectedMonth.year}-${selectedMonth.month.toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`
        });
        console.log('Transaction created successfully');
      } else {
        alert('Failed to create transaction');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Add Transaction</h3>
          <div className="text-sm text-gray-600">
            {selectedMonth.label}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Transaction date input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Transaction description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Transaction description"
            />
          </div>

          {/* Category selection using unified category system */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              {Object.entries(SPENDING_CATEGORIES).map(([groupName, groupCategories]) => (
                <optgroup key={groupName} label={groupName}>
                  {groupCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Transaction amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Transaction type (income/expense) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          {/* Form action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.description || !formData.category || !formData.amount || isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add to ' + selectedMonth.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MonthlyTransactions: React.FC = () => {
  const { budget, isLoading: budgetLoading } = useBudget();
  
  // Transaction data and loading state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<MonthYear[]>([]);
  
  // Initialize with current month as default selection
  const [selectedMonth, setSelectedMonth] = useState<MonthYear>(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return {
      month,
      year,
      label: `${now.toLocaleString('default', { month: 'long' })} ${year}`,
      key: `${year}-${month}`
    };
  });

  // Generate list of available months (current + past 12 months)
  useEffect(() => {
    const months: MonthYear[] = [];
    const now = new Date();
    
    // Create 13 months of data (current + 12 previous)
    for (let i = 0; i < 13; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      months.push({
        month,
        year,
        label: `${date.toLocaleString('default', { month: 'long' })} ${year}`,
        key: `${year}-${month}`
      });
    }
    
    // Sort chronologically with earliest years/months first
    months.sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.month - b.month;
    });
    
    setAvailableMonths(months);
  }, []);

  // Load transactions and categories when month or filters change
  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, [selectedMonth, currentPage, filters]);

  // Fetch transactions for selected month with date range filtering
  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      
      // Calculate month boundaries for API query
      const startDate = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
      const endDate = new Date(selectedMonth.year, selectedMonth.month, 0);
      
      const response = await apiService.getTransactions({
        page: currentPage,
        limit: 50,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        ...filters
      });

      if (response.success && response.data) {
        setTransactions(response.data.transactions || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        console.log(`Loaded ${response.data.transactions?.length || 0} transactions for ${selectedMonth.label}`);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load available transaction categories from API with fallback
  const loadCategories = async () => {
    try {
      const response = await apiService.getTransactionCategories();
      if (response.success && response.data) {
        const categoryNames = response.data.categories.map((cat: any) => {
          if (typeof cat === 'string') return cat;
          return cat?.name || 'Unknown';
        });
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Use unified categories as fallback when API fails
      setCategories(ALL_CATEGORIES);
    }
  };

  // Refresh transaction list after new transaction creation
  const handleTransactionAdded = () => {
    loadTransactions();
  };

  // Handle month change and reset pagination
  const handleMonthChange = (month: MonthYear) => {
    setSelectedMonth(month);
    setCurrentPage(1); // Reset to first page when changing months
    console.log(`Changed to view transactions for ${month.label}`);
  };

  // Calculate monthly spending summary including budget integration
  const monthlySpending = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Include budget income (monthly salary/paycheck) in total income calculation
    const totalIncomeWithPaycheck = totalIncome + (budget.hasSetBudget ? budget.income : 0);

    return {
      totalIncome: totalIncomeWithPaycheck, // Combined transaction + budget income
      transactionIncome: totalIncome, // Only income from transactions
      paycheckIncome: budget.hasSetBudget ? budget.income : 0, // Budget-defined income
      totalExpenses,
      netAmount: totalIncomeWithPaycheck - totalExpenses,
      transactionCount: transactions.length
    };
  }, [transactions, budget]);

  // Calculate budget progress for current month only
  const budgetProgress = useMemo(() => {
    if (!budget.hasSetBudget) return null;
    
    const spent = monthlySpending.totalExpenses;
    const available = budget.availableToSpend;
    const percentage = available > 0 ? (spent / available) * 100 : 0;
    const remaining = available - spent;
    
    return {
      spent,
      available,
      percentage,
      remaining,
      isOverBudget: spent > available
    };
  }, [budget, monthlySpending]);

  // Format currency values consistently across the component
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format dates for transaction display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Page header with branding */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
          <DollarSign className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Monthly Transactions
        </h2>
        <p className="text-gray-600 text-lg">Track and analyze your spending by month</p>
      </div>

      {/* Month selection interface */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        availableMonths={availableMonths}
      />

      {/* Monthly summary cards showing key financial metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total monthly income (transactions + budget) */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Income</h4>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(monthlySpending.totalIncome)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{selectedMonth.label}</p>
        </div>

        {/* Total monthly expenses */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Expenses</h4>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(monthlySpending.totalExpenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{selectedMonth.label}</p>
        </div>

        {/* Net amount (income - expenses) */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Net Amount</h4>
            <div className={`w-4 h-4 rounded-full ${
              monthlySpending.netAmount >= 0 ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </div>
          <p className={`text-2xl font-bold ${
            monthlySpending.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(monthlySpending.netAmount)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {monthlySpending.netAmount >= 0 ? 'Saved' : 'Overspent'}
          </p>
        </div>

        {/* Transaction count for the month */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Transactions</h4>
            <div className="w-4 h-4 bg-blue-500 rounded-full" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {monthlySpending.transactionCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">{selectedMonth.label}</p>
        </div>
      </div>

      {/* Budget progress indicator (only shown for current month) */}
      {budgetProgress && selectedMonth.month === new Date().getMonth() + 1 && selectedMonth.year === new Date().getFullYear() && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold text-gray-900">Budget Progress (Current Month)</h4>
            <span className={`text-sm font-medium ${
              budgetProgress.isOverBudget ? 'text-red-600' : 'text-gray-600'
            }`}>
              {formatCurrency(budgetProgress.spent)} of {formatCurrency(budgetProgress.available)}
            </span>
          </div>
          
          {/* Progress bar with color coding based on usage */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                budgetProgress.isOverBudget
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : budgetProgress.percentage > 80
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-green-500 to-blue-500'
              }`}
              style={{ width: `${Math.min(budgetProgress.percentage, 100)}%` }}
            />
          </div>
          
          {/* Budget status message with color coding */}
          <div className={`text-sm ${
            budgetProgress.isOverBudget ? 'text-red-600' : 
            budgetProgress.percentage > 80 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {budgetProgress.isOverBudget
              ? `Over budget by ${formatCurrency(Math.abs(budgetProgress.remaining))}`
              : budgetProgress.percentage > 80
              ? `Close to limit: ${formatCurrency(budgetProgress.remaining)} remaining`
              : `On track: ${formatCurrency(budgetProgress.remaining)} remaining`
            }
          </div>
        </div>
      )}

      {/* Transaction filters and search interface */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Filter {selectedMonth.label} Transactions</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Text search filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category filter using unified categories */}
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
            className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {Object.entries(SPENDING_CATEGORIES).map(([groupName, groupCategories]) => (
              <optgroup key={groupName} label={groupName}>
                {groupCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Transaction type filter */}
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value || undefined }))}
            className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          {/* Clear all filters button */}
          <button
            onClick={() => setFilters({})}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main transactions table */} 
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900">
            {selectedMonth.label} Transactions ({monthlySpending.transactionCount})
          </h4>
          {/* Always show Add Transaction button in table header */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading {selectedMonth.label} transactions...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No transactions found for {selectedMonth.label}.
                    <br />
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="mt-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Add your first transaction for this month
                    </button>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {transaction.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls for large transaction sets */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} - {selectedMonth.label}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick month comparison for easy navigation */}
      {availableMonths.length > 1 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Month Comparison</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableMonths.slice(0, 3).map((month) => (
              <button
                key={month.key}
                onClick={() => handleMonthChange(month)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  month.key === selectedMonth.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm text-gray-600">{month.label}</div>
                <div className="text-lg font-bold text-gray-900">
                  {month.key === selectedMonth.key ? monthlySpending.transactionCount : '—'}
                </div>
                <div className="text-xs text-gray-500">
                  {month.key === selectedMonth.key ? 'transactions' : 'Click to view'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating action button for adding new transactions */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center z-40"
        title={`Add transaction to ${selectedMonth.label}`}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal for adding new transactions */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={handleTransactionAdded}
        selectedMonth={selectedMonth}
      />

      {/* Development debug information */}
      {import.meta.env.DEV && (
        <div className="mt-6 p-4 bg-gray-800 text-green-400 text-xs rounded-lg font-mono">
          <div className="text-white font-bold mb-2">Monthly Transactions Debug Info</div>
          <div>Selected Month: {selectedMonth.label} ({selectedMonth.key})</div>
          <div>Transactions Loaded: {transactions.length}</div>
          <div>Total Income: ${monthlySpending.totalIncome}</div>
          <div>Total Expenses: ${monthlySpending.totalExpenses}</div>
          <div>Net Amount: ${monthlySpending.netAmount}</div>
          <div>Available Months: {availableMonths.length}</div>
          <div>Budget Available: ${budget.availableToSpend}</div>
          <div>Current Page: {currentPage} of {totalPages}</div>
          <div>Categories Available: {ALL_CATEGORIES.length}</div>
          {budgetProgress && (
            <div>Budget Progress: {budgetProgress.percentage.toFixed(1)}% (Over: {budgetProgress.isOverBudget ? 'Yes' : 'No'})</div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthlyTransactions;