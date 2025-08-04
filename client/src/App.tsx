import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';

// Import our components and context
import AuthProvider, { useAuth } from './context/AuthContext';
import BudgetProvider from './context/budgetContext';
import Header from './components/common/Header';
import Loading from './components/common/Loading';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AIAdvisor from './pages/AIAdvisor';
import Transactions from './pages/transactions';

// Main application content when user is authenticated
const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'advisor' | 'transactions'>('dashboard');
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-gray-300/10 to-gray-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-gray-400/10 to-gray-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header with navigation */}
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {/* Page content routing */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'transactions' && <Transactions />}
        {currentPage === 'advisor' && <AIAdvisor />}
      </div>

      {/* Development debug panel */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-green-400 p-4 rounded-lg text-xs font-mono max-w-sm">
          <div className="text-white font-bold mb-2">Debug Info</div>
          <div>User: {user?.email || 'Not logged in'}</div>
          <div>Page: {currentPage}</div>
          <div>API: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}</div>
        </div>
      )}
    </div>
  );
};

// Authentication router component
const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('Auth Status:', { 
    isAuthenticated, 
    isLoading, 
    userEmail: user?.email || 'none',
    userId: user?.id || 'none'
  });

  // Loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Unauthenticated state
  if (!isAuthenticated) {
    return <Login />;
  }

  // Authenticated state with budget context
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  );
};

// Root app component with auth provider
const App: React.FC = () => {
  console.log('MoneyWise App starting...');
  
  if (import.meta.env.DEV) {
    console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:5000');
    console.log('Environment:', import.meta.env.MODE);
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