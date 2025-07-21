/**
 * Dashboard.tsx - Main dashboard page for the Budget Application
 * 
 * <description>
 *   This component serves as the primary financial overview interface, providing users
 *   with input fields for budget planning and real-time calculation of available spending funds.
 *   Features include income tracking, expense management, savings goal setting, and CSV data import.
 * </description>
 * 
 * <component name="Dashboard" />
 * <returns>JSX.Element - The main dashboard interface</returns>
 */

import { useState } from 'react';
import { TrendingUp, AlertCircle, Target, DollarSign, Wallet, CreditCard, CheckCircle, Sparkles } from 'lucide-react';
import CSVUpload from '../components/dashboard/CSVUpload';

const Dashboard = () => {
  // <state-management>
  const [income, setIncome] = useState('');           // <field>User's monthly income amount</field>
  const [fixedExpenses, setFixedExpenses] = useState(''); // <field>Monthly fixed expenses (rent, utilities, insurance, etc.)</field>
  const [savingsGoal, setSavingsGoal] = useState('');     // <field>Target monthly savings amount</field>
  // </state-management>

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

  return (
    <>
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
                  </input-field> */}
              <div className="relative">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="5,000"
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400"
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
                  </input-field> */}
              <div className="relative">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={fixedExpenses}
                  onChange={(e) => setFixedExpenses(e.target.value)}
                  placeholder="2,000"
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400"
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
                  </input-field> */}
              <div className="relative">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  placeholder="1,000"
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* <card type="calculation-display">
              <theme>Purple gradient for highlighting results</theme>
              <purpose>Real-time budget calculation display</purpose>
              <calculation>Dynamic spending budget computation</calculation>
            </card> */}
        <div className="group bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-white">
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
              <p className="text-3xl font-bold">
                ${availableToSpend.toLocaleString()}
              </p>
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

      {/* <external-component>
            <name>CSVUpload</name>
            <purpose>External transaction data integration</purpose>
            <functionality>File import and data processing</functionality>
          </external-component> */}
      <CSVUpload />
    </>
  );
};

export default Dashboard;