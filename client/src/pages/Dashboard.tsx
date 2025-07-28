import { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Target, DollarSign, Sparkles, Save, RefreshCw } from 'lucide-react';
import CSVUpload from '../components/dashboard/CSVUpload';
import { apiService } from '../services/api';

const Dashboard = () => {
  const [income, setIncome] = useState('');
  const [fixedExpenses, setFixedExpenses] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadCurrentMonthData();
  }, []);

  // Auto-save when values change (with debounce)
  useEffect(() => {
    if (!isLoading && (income || fixedExpenses || savingsGoal)) {
      const timeoutId = setTimeout(() => {
        saveCurrentMonthData();
      }, 2000); // Auto-save after 2 seconds of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [income, fixedExpenses, savingsGoal, isLoading]);

  const loadCurrentMonthData = async () => {
    try {
      console.log('📊 Loading current month data...');
      setIsLoading(true);
      
      const response = await apiService.getCurrentMonthData();
      
      if (response.success && response.data) {
        console.log('✅ Data loaded:', response.data);
        setIncome(response.data.income?.toString() || '');
        setFixedExpenses(response.data.fixed_expenses?.toString() || '');
        setSavingsGoal(response.data.savings_goal?.toString() || '');
      } else {
        console.log('📝 No existing data found, starting fresh');
        // No existing data is fine, user starts with empty form
      }
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      setError('Failed to load your financial data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentMonthData = async () => {
    // Only save if we have at least one value
    if (!income && !fixedExpenses && !savingsGoal) {
      return;
    }

    try {
      console.log('💾 Saving current month data...');
      setIsSaving(true);
      setError('');

      const data = {
        income: parseFloat(income) || 0,
        fixedExpenses: parseFloat(fixedExpenses) || 0,
        savingsGoal: parseFloat(savingsGoal) || 0
      };

      const response = await apiService.updateCurrentMonthData(data);
      
      if (response.success) {
        console.log('✅ Data saved successfully');
        setLastSaved(new Date());
      } else {
        console.error('❌ Save failed:', response.error);
        setError('Failed to save your data');
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      setError('Failed to save your data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = () => {
    saveCurrentMonthData();
  };

  const availableToSpend = income && fixedExpenses 
    ? parseFloat(income) - parseFloat(fixedExpenses) - parseFloat(savingsGoal || '0') 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-gray-600">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Save Status Bar */}
      <div className="mb-6 flex items-center justify-between bg-white/50 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
        <div className="flex items-center space-x-3">
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-600">Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Enter your budget to auto-save</span>
            </>
          )}
        </div>

        <button
          onClick={handleManualSave}
          disabled={isSaving || (!income && !fixedExpenses && !savingsGoal)}
          className="flex items-center space-x-2 px-3 py-1 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-3 h-3" />
          <span>Save Now</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-600 text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </p>
        </div>
      )}

      {/* Financial Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        
        {/* Monthly Income Card */}
        <div className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Monthly Income</p>
              </div>
              <div className="relative">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="5,000"
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Expenses Card */}
        <div className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Fixed Expenses</p>
              </div>
              <div className="relative">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={fixedExpenses}
                  onChange={(e) => setFixedExpenses(e.target.value)}
                  placeholder="2,000"
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Savings Goal Card */}
        <div className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-blue-500" />
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Savings Goal</p>
              </div>
              <div className="relative">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  placeholder="1,000"
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Available to Spend Card */}
        <div className="group bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-white/80" />
                <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">Available to Spend</p>
              </div>
              <p className="text-3xl font-bold">
                ${availableToSpend.toLocaleString()}
              </p>
              {availableToSpend < 0 && (
                <p className="text-xs text-white/80 mt-1">⚠️ Over budget</p>
              )}
            </div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* CSV Upload Component */}
      <CSVUpload />
    </>
  );
};

export default Dashboard;