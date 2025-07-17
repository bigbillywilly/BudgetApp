import { useState } from 'react';
import { TrendingUp, AlertCircle, Target, DollarSign, Wallet, CreditCard, CheckCircle, Sparkles } from 'lucide-react';
import CSVUpload from './CSVUpload';

const Dashboard = () => {
  const [income, setIncome] = useState('');
  const [fixedExpenses, setFixedExpenses] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');

  const availableToSpend = income && fixedExpenses 
    ? parseFloat(income) - parseFloat(fixedExpenses) - parseFloat(savingsGoal || '0') 
    : 0;

  return (
    <>
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* Income Card */}
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
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400"
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
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400"
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
                  className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400"
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
            </div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* CSV Upload Section */}
      <CSVUpload />
    </>
  );
};

export default Dashboard;