import React, { useState } from 'react';
import { History, Calendar, BarChart3 } from 'lucide-react';

// Import our components and context
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/common/Header';
import Loading from './components/common/Loading';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AIAdvisor from './pages/AIAdvisor';

// Protected App Content - Main application when user is authenticated
const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'previous' | 'advisor'>('dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-gray-300/10 to-gray-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-gray-400/10 to-gray-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header with Navigation and User Info */}
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {/* Main Content Area */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Page */}
        {currentPage === 'dashboard' && <Dashboard />}
        
        {/* AI Advisor Page */}
        {currentPage === 'advisor' && <AIAdvisor />}
        
        {/* Previous Months Page (Coming Soon) */}
        {currentPage === 'previous' && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                <History className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Previous Months
              </h2>
              <p className="text-gray-600 text-lg">Track your financial history and progress over time</p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-12 border border-white/20 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600 mb-6">
                Previous months functionality will be implemented next. This will show your historical financial data and spending trends.
              </p>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// App Router - Handles authentication flow
const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('🔐 Auth Status:', { isAuthenticated, isLoading, user: user?.email });

  // Show loading screen while checking authentication
  if (isLoading) {
    return <Loading />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Show main app if authenticated
  return <AppContent />;
};

// Main App Component
const App: React.FC = () => {
  console.log('🚀 MoneyWise App starting...');
  
  // For Vite, use import.meta.env instead of process.env
  // Only log in development mode
  if (import.meta.env.DEV) {
    console.log('🌐 API URL:', import.meta.env.VITE_API_URL || 'http://localhost:5000');
  }

  return (
    <div className="App">
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </div>
  );
};

export default App;