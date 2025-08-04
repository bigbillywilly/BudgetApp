// Dashboard page for paycheck-focused budget management and financial tracking
// Handles paycheck frequency calculation, budget setup, and CSV upload analysis
import React, { useState } from 'react';
import { DollarSign, TrendingUp, Target, Upload, BarChart3, Calendar, Briefcase } from 'lucide-react';
import { useBudget } from '../context/budgetContext';
import SmartCSVUpload from '../components/dashboard/SmartCSVUpload';

// CSV upload result structure with budget analysis
interface UploadResult {
  uploadId: string;
  filename: string;
  budgetAnalysis?: {
    availableToSpend: number;
    totalSpent: number;
    remaining: number;
    percentageUsed: number;
    isOverBudget: boolean;
  };
  categoryBreakdown: { [category: string]: { total: number; count: number } };
}

// Paycheck frequency configuration with monthly multipliers
const PaycheckFrequencies = {
  weekly: { label: 'Weekly', multiplier: 4.33, icon: 'Calendar', description: 'Every Friday' },
  biweekly: { label: 'Bi-weekly', multiplier: 2.17, icon: 'Briefcase', description: 'Every 2 weeks' },
  monthly: { label: 'Monthly', multiplier: 1, icon: 'Calendar', description: 'Once per month' },
  semimonthly: { label: 'Semi-monthly', multiplier: 2, icon: 'BarChart3', description: '1st & 15th' }
} as const;

type PaycheckFrequency = keyof typeof PaycheckFrequencies;

const Dashboard: React.FC = () => {
  // Budget context provides centralized state management
  const { budget, isLoading: budgetLoading, updateBudget, refreshBudget } = useBudget();
  
  // Start in editing mode if no budget is configured
  const [isEditing, setIsEditing] = useState(!budget.hasSetBudget);
  const [isSaving, setIsSaving] = useState(false);
  const [recentUpload, setRecentUpload] = useState<UploadResult | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  
  // Paycheck frequency state for income calculations
  const [paycheckFrequency, setPaycheckFrequency] = useState<PaycheckFrequency>('biweekly');
  
  // Local editing state with string values for proper input handling
  const [editingData, setEditingData] = useState({
    paycheckAmount: '', // Individual paycheck amount before frequency calculation
    fixedExpenses: budget.fixedExpenses > 0 ? budget.fixedExpenses.toString() : '',
    savingsGoal: budget.savingsGoal > 0 ? budget.savingsGoal.toString() : '',
  });

  // Convert individual paycheck amount to monthly income based on frequency
  const calculateMonthlyIncome = (paycheckAmount: number, frequency: PaycheckFrequency): number => {
    return paycheckAmount * PaycheckFrequencies[frequency].multiplier;
  };

  // Convert monthly income back to individual paycheck amount for display
  const calculatePaycheckAmount = (monthlyIncome: number, frequency: PaycheckFrequency): number => {
    return monthlyIncome / PaycheckFrequencies[frequency].multiplier;
  };

  // Sync editing data when budget context changes
  React.useEffect(() => {
    // Calculate current paycheck amount from monthly income
    const estimatedPaycheckAmount = budget.income > 0 
      ? calculatePaycheckAmount(budget.income, paycheckFrequency) 
      : 0;
    
    setEditingData({
      paycheckAmount: estimatedPaycheckAmount > 0 ? estimatedPaycheckAmount.toFixed(2) : '',
      fixedExpenses: budget.fixedExpenses > 0 ? budget.fixedExpenses.toString() : '',
      savingsGoal: budget.savingsGoal > 0 ? budget.savingsGoal.toString() : '',
    });
    
    // Auto-enter editing mode for new users without budget setup
    if (!budget.hasSetBudget && !isEditing) {
      setIsEditing(true);
    }
  }, [budget, paycheckFrequency, isEditing]);

  // Handle numeric input changes with validation
  const handleInputChange = (field: string, value: string) => {
    // Allow empty string or valid decimal numbers only
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEditingData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Update paycheck frequency and recalculate amounts
  const handleFrequencyChange = (frequency: PaycheckFrequency) => {
    const currentPaycheckAmount = parseFloat(editingData.paycheckAmount) || 0;
    setPaycheckFrequency(frequency);
    
    // Maintain consistent monthly income when changing frequency
    if (currentPaycheckAmount > 0) {
      const currentMonthlyIncome = calculateMonthlyIncome(currentPaycheckAmount, paycheckFrequency);
      const newPaycheckAmount = calculatePaycheckAmount(currentMonthlyIncome, frequency);
      
      setEditingData(prev => ({
        ...prev,
        paycheckAmount: newPaycheckAmount.toFixed(2)
      }));
    }
  };

  // Save budget data to backend with validation
  const handleSave = async () => {
    const paycheckAmount = parseFloat(editingData.paycheckAmount) || 0;
    const monthlyIncome = calculateMonthlyIncome(paycheckAmount, paycheckFrequency);
    const fixedExpenses = parseFloat(editingData.fixedExpenses) || 0;
    const savingsGoal = parseFloat(editingData.savingsGoal) || 0;

    // Validate input values before saving
    if (paycheckAmount <= 0 || fixedExpenses < 0 || savingsGoal < 0) {
      alert('Please enter valid amounts');
      return;
    }

    setIsSaving(true);
    
    try {
      const result = await updateBudget({
        income: monthlyIncome, // Save calculated monthly income to backend
        fixedExpenses,
        savingsGoal
      });

      if (result.success) {
        setIsEditing(false);
        console.log('Budget saved successfully');
      } else {
        alert('Failed to save budget: ' + result.error);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle CSV upload completion and refresh budget data
  const handleUploadComplete = async (uploadData: any) => {
    console.log('CSV upload completed:', uploadData);
    setRecentUpload(uploadData);
    setShowUpload(false);
    
    // Refresh budget context in case transactions affected budget calculations
    await refreshBudget();
  };

  // Calculate savings rate as percentage of income
  const savingsRate = budget.income > 0 ? (budget.savingsGoal / budget.income) * 100 : 0;

  // Current paycheck information for display
  const currentPaycheckAmount = budget.income > 0 
    ? calculatePaycheckAmount(budget.income, paycheckFrequency) 
    : 0;
  
  const paycheckInfo = PaycheckFrequencies[paycheckFrequency];

  // Map icon names to components for frequency display
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Calendar': return <Calendar className="w-6 h-6" />;
      case 'Briefcase': return <Briefcase className="w-6 h-6" />;
      case 'BarChart3': return <BarChart3 className="w-6 h-6" />;
      default: return <Calendar className="w-6 h-6" />;
    }
  };

  // Show loading state while budget data is being fetched
  if (budgetLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your budget data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Dashboard header with branding */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
          <BarChart3 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Financial Dashboard
        </h2>
        <p className="text-gray-600 text-lg">Track your paychecks, expenses, and savings goals</p>
      </div>

      {/* Main budget setup card with paycheck focus */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Paycheck & Budget Setup</h3>
              <p className="text-gray-600">Enter your individual paycheck amount and frequency</p>
            </div>
          </div>
          {/* Edit button for existing budget configurations */}
          {budget.hasSetBudget && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Edit Budget
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column: Paycheck configuration */}
          <div className="space-y-6">
            {/* Paycheck frequency selector with visual grid */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                How often do you get paid?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PaycheckFrequencies).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleFrequencyChange(key as PaycheckFrequency)}
                    disabled={budget.hasSetBudget && !isEditing}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      paycheckFrequency === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${(budget.hasSetBudget && !isEditing) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-semibold text-gray-900">{info.label}</div>
                        <div className="text-sm text-gray-600">{info.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Individual paycheck amount input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Individual Paycheck Amount ({paycheckInfo.label})
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={!budget.hasSetBudget || isEditing ? editingData.paycheckAmount : currentPaycheckAmount.toFixed(2)}
                  onChange={(e) => handleInputChange('paycheckAmount', e.target.value)}
                  className="w-full pl-10 pr-4 py-4 text-xl font-semibold bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="2500"
                  disabled={budget.hasSetBudget && !isEditing}
                />
              </div>
              <p className="text-sm text-gray-500">
                Enter the amount you receive in each individual paycheck
              </p>
            </div>

            {/* Monthly income preview with frequency calculation */}
            {(editingData.paycheckAmount || budget.hasSetBudget) && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700">Monthly Income</p>
                    <p className="text-2xl font-bold text-blue-900">
                      ${(!budget.hasSetBudget || isEditing) 
                        ? calculateMonthlyIncome(parseFloat(editingData.paycheckAmount) || 0, paycheckFrequency).toLocaleString()
                        : budget.income.toLocaleString()
                      }
                    </p>
                  </div>
                  <div className="text-right text-sm text-blue-600">
                    <p>{paycheckInfo.multiplier.toFixed(1)} paychecks/month</p>
                    <p>{paycheckInfo.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column: Fixed expenses and savings */}
          <div className="space-y-6">
            {/* Fixed monthly expenses input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fixed Monthly Expenses
                <span className="text-gray-500 text-xs ml-1">(Rent, bills, insurance, etc.)</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={!budget.hasSetBudget || isEditing ? editingData.fixedExpenses : budget.fixedExpenses.toString()}
                  onChange={(e) => handleInputChange('fixedExpenses', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="2000"
                  disabled={budget.hasSetBudget && !isEditing}
                />
              </div>
            </div>

            {/* Monthly savings goal input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Monthly Savings Goal
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={!budget.hasSetBudget || isEditing ? editingData.savingsGoal : budget.savingsGoal.toString()}
                  onChange={(e) => handleInputChange('savingsGoal', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="1000"
                  disabled={budget.hasSetBudget && !isEditing}
                />
              </div>
            </div>

            {/* Available spending preview with real-time calculation */}
            {(editingData.paycheckAmount && editingData.fixedExpenses && editingData.savingsGoal) && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Available to Spend</p>
                    <p className="text-2xl font-bold text-green-900">
                      ${Math.max(0, 
                        calculateMonthlyIncome(parseFloat(editingData.paycheckAmount) || 0, paycheckFrequency) -
                        (parseFloat(editingData.fixedExpenses) || 0) -
                        (parseFloat(editingData.savingsGoal) || 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-sm text-green-600">
                    <p>After fixed costs</p>
                    <p>& savings goal</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comprehensive budget breakdown summary */}
        {budget.hasSetBudget && (
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Paycheck Breakdown</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Per paycheck amount */}
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div>
                    <p className="text-xl font-bold text-green-600">
                      ${currentPaycheckAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Per Paycheck</p>
                  </div>
                </div>
              </div>
              
              {/* Monthly total income */}
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">
                  ${budget.income.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Monthly Total</p>
                <p className="text-xs text-gray-500">{paycheckInfo.multiplier.toFixed(1)} paychecks</p>
              </div>
              
              {/* Combined fixed costs */}
              <div className="text-center">
                <p className="text-xl font-bold text-red-600">
                  ${(budget.fixedExpenses + budget.savingsGoal).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Fixed Costs</p>
                <p className="text-xs text-gray-500">Expenses + Savings</p>
              </div>
              
              {/* Available flexible spending */}
              <div className="text-center">
                <p className={`text-xl font-bold ${budget.availableToSpend >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  ${budget.availableToSpend.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Flexible Spending</p>
                <p className="text-xs text-gray-500">
                  ${(budget.availableToSpend / paycheckInfo.multiplier).toFixed(0)} per paycheck
                </p>
              </div>
            </div>
            
            {/* Budget health indicators and metrics */}
            <div className="mt-6 pt-4 border-t border-blue-200">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Savings Rate: {savingsRate.toFixed(1)}%</span>
                <span>Pay Frequency: {paycheckInfo.label}</span>
                <span>
                  {budget.availableToSpend < 0 ? 
                    'Budget needs adjustment' : 
                    budget.availableToSpend < 500 ? 
                    'Tight budget' : 
                    'Healthy budget'
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Save and cancel action buttons for editing mode */}
        {(isEditing || !budget.hasSetBudget) && (
          <div className="flex space-x-4 mt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {isSaving ? 'Saving...' : 'Save Paycheck Budget'}
            </button>
            {/* Cancel button for existing budget modifications */}
            {isEditing && budget.hasSetBudget && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reset editing data to current budget values
                  const estimatedPaycheckAmount = budget.income > 0 
                    ? calculatePaycheckAmount(budget.income, paycheckFrequency) 
                    : 0;
                  
                  setEditingData({
                    paycheckAmount: estimatedPaycheckAmount > 0 ? estimatedPaycheckAmount.toFixed(2) : '',
                    fixedExpenses: budget.fixedExpenses > 0 ? budget.fixedExpenses.toString() : '',
                    savingsGoal: budget.savingsGoal > 0 ? budget.savingsGoal.toString() : '',
                  });
                }}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* CSV upload section for transaction analysis */}
      {budget.hasSetBudget && (
        <div className="space-y-6">
          {/* Upload prompt when no recent upload or active upload */}
          {!showUpload && !recentUpload && (
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 text-center">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Analyze Your Spending?</h3>
              <p className="text-gray-600 mb-6">
                Upload your bank statement CSV to see how your actual spending compares to your paycheck budget
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Upload Bank Statement
              </button>
            </div>
          )}

          {/* Active CSV upload component */}
          {showUpload && (
            <SmartCSVUpload onUploadComplete={handleUploadComplete} />
          )}

          {/* Recent upload analysis results */}
          {recentUpload && recentUpload.budgetAnalysis && (
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Latest Analysis</h3>
                <button
                  onClick={() => setShowUpload(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Upload New File
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Budget vs Actual */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">Paycheck Budget vs Actual</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Budget Available:</span>
                      <span className="font-semibold">
                        ${recentUpload.budgetAnalysis.availableToSpend.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Actually Spent:</span>
                      <span className="font-semibold">
                        ${recentUpload.budgetAnalysis.totalSpent.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-gray-600">Difference:</span>
                      <span className={`font-bold ${
                        recentUpload.budgetAnalysis.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {recentUpload.budgetAnalysis.remaining >= 0 ? '+' : ''}
                        ${recentUpload.budgetAnalysis.remaining.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      That's ${(recentUpload.budgetAnalysis.remaining / paycheckInfo.multiplier).toFixed(0)} per paycheck difference
                    </div>
                  </div>
                </div>

                {/* Top Categories */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">Top Spending Categories</h4>
                  <div className="space-y-2">
                    {Object.entries(recentUpload.categoryBreakdown)
                      .sort(([,a], [,b]) => b.total - a.total)
                      .slice(0, 4)
                      .map(([category, data]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">{category}</span>
                          <span className="font-semibold">${data.total.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Getting Started */}
      {!budget.hasSetBudget && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 border border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Get Started</h3>
          <div className="space-y-2 text-gray-700">
            <p>1. Select how often you get paid (weekly, bi-weekly, etc.)</p>
            <p>2. Enter your individual paycheck amount</p>
            <p>3. Add your fixed expenses and savings goal</p>
            <p>4. Upload your bank statement CSV for analysis</p>
            <p>5. Get insights on your spending vs paycheck budget</p>
          </div>
        </div>
      )}

      {/* Debug Info (Development Only) */}
      {import.meta.env.DEV && (
        <div className="mt-6 p-4 bg-gray-800 text-green-400 text-xs rounded-lg font-mono">
          <div className="text-white font-bold mb-2">Paycheck Budget Debug Info</div>
          <div>Frequency: {paycheckFrequency} ({paycheckInfo.label})</div>
          <div>Multiplier: {paycheckInfo.multiplier}</div>
          <div>Paycheck Amount: ${currentPaycheckAmount.toFixed(2)}</div>
          <div>Monthly Income: ${budget.income}</div>
          <div>Fixed Expenses: ${budget.fixedExpenses}</div>
          <div>Savings Goal: ${budget.savingsGoal}</div>
          <div>Available to Spend: ${budget.availableToSpend}</div>
          <div>Per Paycheck Available: ${(budget.availableToSpend / paycheckInfo.multiplier).toFixed(2)}</div>
          <div>Has Set Budget: {budget.hasSetBudget ? 'Yes' : 'No'}</div>
          <div>Is Editing: {isEditing ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;