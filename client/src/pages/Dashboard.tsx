/**
 * Dashboard.tsx - Enhanced dashboard with backend integration
 * 
 * <description>
 *   This component maintains the beautiful existing design while adding real backend integration.
 *   Users can input their monthly budget which automatically saves to the backend and flows to
 *   the transactions page for comprehensive spending analysis and categorization.
 * </description>
 * 
 * <component name="Dashboard" />
 * <returns>JSX.Element - The enhanced dashboard interface with real data</returns>
 */

import { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Target, DollarSign, Wallet, CreditCard, CheckCircle, Sparkles, Save, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import CSVUpload from '../components/dashboard/CSVUpload';

interface MonthlyData {
  month: number;
  year: number;
  income: number;
  fixedExpenses: number;
  savingsGoal: number;
}

interface TransactionSummary {
  totalSpent: number;
  transactionCount: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

const Dashboard = () => {
  // <state-management>
  const [income, setIncome] = useState('');           // User's monthly income amount
  const [fixedExpenses, setFixedExpenses] = useState(''); // Monthly fixed expenses
  const [savingsGoal, setSavingsGoal] = useState('');     // Target monthly savings amount
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  // </state-management>

  // Load existing data on component mount
  useEffect(() => {
    loadDashboardData();
    
    // Listen for updates from other components
    const handleRefresh = () => {
      console.log('🏠 Dashboard refresh triggered');
      loadTransactionSummary();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'transactions_updated') {
        console.log('📁 CSV upload detected, refreshing dashboard');
        loadTransactionSummary();
      }
    };

    window.addEventListener('refresh_transactions', handleRefresh);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('refresh_transactions', handleRefresh);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Auto-save when values change (with debounce)
  useEffect(() => {
    if (income || fixedExpenses || savingsGoal) {
      const timeoutId = setTimeout(() => {
        saveMonthlyData();
      }, 1000); // Save 1 second after user stops typing

      return () => clearTimeout(timeoutId);
    }
  }, [income, fixedExpenses, savingsGoal]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      console.log('🏠 Loading dashboard data...');
      
      // Load monthly data
      const monthlyResponse = await apiService.getCurrentMonthData();
      console.log('📊 Monthly data response:', monthlyResponse);

      if (monthlyResponse.success && monthlyResponse.data) {
        const data = monthlyResponse.data;
        setMonthlyData(data);
        setIncome(data.income.toString());
        setFixedExpenses(data.fixedExpenses.toString());
        setSavingsGoal(data.savingsGoal.toString());
      } else {
        // No existing data, start fresh
        const now = new Date();
        setMonthlyData({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          income: 0,
          fixedExpenses: 0,
          savingsGoal: 0
        });
      }

      // Load transaction summary
      await loadTransactionSummary();

    } catch (error) {
      console.error('❌ Dashboard loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionSummary = async () => {
    try {
      // Get current month transactions
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const response = await apiService.getTransactions({ 
        limit: 1000,
        startDate: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`,
        endDate: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`
      });

      if (response.success && response.data) {
        const transactions = response.data.transactions || [];
        console.log('📊 Current month transactions:', transactions.length);

        // Calculate spending for current month
        const expenses = transactions.filter((t: any) => t.type === 'expense');
        const totalSpent = expenses.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

        // Calculate category breakdown
        const categoryTotals: { [key: string]: number } = {};
        expenses.forEach((t: any) => {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
        });

        const topCategories = Object.entries(categoryTotals)
          .map(([category, amount]) => ({
            category,
            amount,
            percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        setTransactionSummary({
          totalSpent,
          transactionCount: transactions.length,
          topCategories
        });

        console.log('📈 Transaction summary updated:', { totalSpent, transactionCount: transactions.length });
      }
    } catch (error) {
      console.error('❌ Transaction summary loading error:', error);
    }
  };

  const saveMonthlyData = async () => {
    // Don't save if values are empty or haven't changed
    if (!income && !fixedExpenses && !savingsGoal) return;
    
    setSaving(true);
    
    try {
      const updateData = {
        income: parseFloat(income) || 0,
        fixedExpenses: parseFloat(fixedExpenses) || 0,
        savingsGoal: parseFloat(savingsGoal) || 0
      };

      console.log('💾 Auto-saving monthly data:', updateData);

      const response = await apiService.updateCurrentMonthData(updateData);

      if (response.success) {
        setLastSaved(new Date());
        
        // Update local monthly data
        if (monthlyData) {
          setMonthlyData({
            ...monthlyData,
            ...updateData
          });
        }

        // Trigger refresh across the app
        window.dispatchEvent(new CustomEvent('refresh_transactions'));
        localStorage.setItem('budget_updated', Date.now().toString());
        
        console.log('✅ Monthly data auto-saved successfully');
      } else {
        console.error('❌ Auto-save failed:', response.error);
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * <calculation>
   *   <name>availableToSpend</name>
   *   <formula>Income - Fixed Expenses - Savings Goal = Available to Spend</formula>
   *   <returns>number - The calculated available spending amount</returns>
   * </calculation>
   */
  const availableToSpend = income && fixedExpenses 
    ? parseFloat(income) - parseFloat(fixedExpenses) - parseFloat(savingsGoal || '0') 
    : 0;

  /**
   * <calculation>
   *   <name>spendingProgress</name>
   *   <formula>Calculate how much of budget is used</formula>
   *   <returns>object - Progress metrics and status</returns>
   * </calculation>
   */
  const getSpendingProgress = () => {
    const totalSpent = transactionSummary?.totalSpent || 0;
    const remaining = availableToSpend - totalSpent;
    const progressPercent = availableToSpend > 0 ? (totalSpent / availableToSpend) * 100 : 0;
    
    return {
      totalSpent,
      remaining,
      progressPercent,
      status: progressPercent > 100 ? 'over' : progressPercent > 80 ? 'warning' : 'good'
    };
  };

  const progress = getSpendingProgress();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Save Status Indicator */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saving && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
          {lastSaved && !saving && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        
        {monthlyData && (
          <div className="text-sm text-gray-600">
            {new Date(monthlyData.year, monthlyData.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} Budget
          </div>
        )}
      </div>

      {/* <grid>
            <layout>Financial Overview Cards Grid</layout>
            <responsive>Adapts from 1 column (mobile) to 4 columns (desktop)</responsive>
          </grid> */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        
        {/* <card type="income-input">
              <theme>Green themed for positive financial flow</theme>
              <purpose>Primary income data entry point</purpose>
            </card> */}
        <div className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* <header>
                    <icon>TrendingUp - Represents growth/income</icon>
                    <label>Monthly Income</label>
                  </header> */}
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Monthly Income</p>
              </div>
              {/* <input-field>
                    <type>number</type>
                    <currency>USD</currency>
                    <placeholder>5,000</placeholder>
                    <auto-save>Saves automatically after 1 second</auto-save>
                  </input-field> */}
              <div className="relative">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="5,000"
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400 w-full"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* <card type="fixed-expenses-input">
              <theme>Orange themed for caution/expenses</theme>
              <purpose>Essential monthly obligations tracking</purpose>
            </card> */}
        <div className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* <header>
                    <icon>AlertCircle - Warning indicator for expenses</icon>
                    <label>Fixed Expenses</label>
                  </header> */}
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Fixed Expenses</p>
              </div>
              {/* <input-field>
                    <type>number</type>
                    <currency>USD</currency>
                    <placeholder>2,000</placeholder>
                    <auto-save>Saves automatically after 1 second</auto-save>
                  </input-field> */}
              <div className="relative">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={fixedExpenses}
                  onChange={(e) => setFixedExpenses(e.target.value)}
                  placeholder="2,000"
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400 w-full"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* <card type="savings-goal-input">
              <theme>Blue themed for financial planning</theme>
              <purpose>Financial planning and goal setting</purpose>
            </card> */}
        <div className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* <header>
                    <icon>Target - Represents goal achievement</icon>
                    <label>Savings Goal</label>
                  </header> */}
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-blue-500" />
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Savings Goal</p>
              </div>
              {/* <input-field>
                    <type>number</type>
                    <currency>USD</currency>
                    <placeholder>1,000</placeholder>
                    <auto-save>Saves automatically after 1 second</auto-save>
                  </input-field> */}
              <div className="relative">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  placeholder="1,000"
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400 w-full"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* <card type="calculation-display">
              <theme>Purple gradient for highlighting results</theme>
              <purpose>Real-time budget calculation display</purpose>
              <calculation>Dynamic spending budget computation</calculation>
              <enhanced>Now shows spending progress and status</enhanced>
            </card> */}
        <div className={`group rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-white ${
          progress.status === 'over' ? 'bg-gradient-to-br from-red-500 to-red-600' :
          progress.status === 'warning' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
          'bg-gradient-to-br from-purple-500 to-pink-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* <header>
                    <icon>DollarSign - Currency indicator</icon>
                    <label>Available to Spend</label>
                  </header> */}
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-white/80" />
                <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">Available to Spend</p>
              </div>
              {/* <display-value>
                    <format>Currency with thousand separators</format>
                    <calculation>Real-time computation result</calculation>
                  </display-value> */}
              <p className="text-3xl font-bold mb-1">
                {formatCurrency(availableToSpend)}
              </p>
              
              {/* <spending-progress>
                    <current-spending>Shows actual spending vs budget</current-spending>
                    <remaining>Remaining budget calculation</remaining>
                  </spending-progress> */}
              {transactionSummary && availableToSpend > 0 && (
                <div className="text-xs text-white/70 space-y-1">
                  <div>Spent: {formatCurrency(progress.totalSpent)} ({Math.round(progress.progressPercent)}%)</div>
                  <div>Remaining: {formatCurrency(progress.remaining)}</div>
                  {progress.status === 'over' && (
                    <div className="text-white font-semibold">⚠️ Over budget!</div>
                  )}
                </div>
              )}
            </div>
            {/* <visual-enhancement>
                  <icon>Sparkles - Visual appeal indicator</icon>
                  <animation>Scale on hover interaction</animation>
                </visual-enhancement> */}
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* <spending-overview>
            <purpose>Show current month spending breakdown</purpose>
            <data-source>Real transaction data from backend</data-source>
          </spending-overview> */}
      {transactionSummary && transactionSummary.transactionCount > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-purple-500" />
            This Month's Spending Overview
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* <spending-stats>
                  <transactions>Total transaction count</transactions>
                  <spent>Total amount spent</spent>
                </spending-stats> */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Transactions</span>
                <span className="font-bold text-gray-900">{transactionSummary.transactionCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Spent</span>
                <span className="font-bold text-red-600">{formatCurrency(transactionSummary.totalSpent)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Budget Used</span>
                <span className={`font-bold ${progress.status === 'over' ? 'text-red-600' : progress.status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                  {Math.round(progress.progressPercent)}%
                </span>
              </div>
            </div>

            {/* <top-categories>
                  <purpose>Show where money is being spent</purpose>
                  <limit>Top 3 categories</limit>
                </top-categories> */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Top Spending Categories</h4>
              {transactionSummary.topCategories.slice(0, 3).map((category, index) => (
                <div key={category.category} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{category.category}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(category.amount)}</span>
                    <span className="text-xs text-gray-500 ml-2">({Math.round(category.percentage)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* <progress-bar>
                <visual>Budget usage progress bar</visual>
                <color-coded>Green/Yellow/Red based on usage</color-coded>
              </progress-bar> */}
          {availableToSpend > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Budget Progress</span>
                <span>{Math.round(progress.progressPercent)}% used</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    progress.status === 'over' ? 'bg-red-500' : 
                    progress.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(progress.progressPercent, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* <external-component>
            <name>CSVUpload</name>
            <purpose>External transaction data integration</purpose>
            <functionality>File import and data processing</functionality>
            <integration>Triggers dashboard refresh on upload</integration>
          </external-component> */}
      <CSVUpload />
    </>
  );
};

export default Dashboard;