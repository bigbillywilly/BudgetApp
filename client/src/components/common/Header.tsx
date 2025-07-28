// client/src/components/common/Header.tsx
import React from 'react';
import { LogOut, User, BarChart3, MessageSquare, History, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  currentPage: 'dashboard' | 'previous' | 'advisor' | 'transactions';
  setCurrentPage: (page: 'dashboard' | 'previous' | 'advisor' | 'transactions') => void;
}

// Define user type to handle different possible user data structures
interface UserData {
  name?: string;
  email?: string;
  [key: string]: any;
}

const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useAuth();
  
  // Type guard to safely access user properties
  const userData = user as UserData | string | null;

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Overview & Budget'
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: CreditCard,
      description: 'View & Manage'
    },
    {
      id: 'previous',
      label: 'History',
      icon: History,
      description: 'Previous Months'
    },
    {
      id: 'advisor',
      label: 'AI Advisor',
      icon: MessageSquare,
      description: 'Financial Assistant'
    }
  ] as const;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Helper functions to safely extract user data
  const getUserName = (): string => {
    if (!userData) return 'User';
    if (typeof userData === 'string') return 'User';
    return userData.name || 'User';
  };

  const getUserEmail = (): string => {
    if (!userData) return 'user@example.com';
    if (typeof userData === 'string') return userData;
    return userData.email || 'user@example.com';
  };

  return (
    <header className="relative bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MoneyWise
              </h1>
              <p className="text-xs text-gray-500">Financial Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`group relative px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </div>
                  
                  {/* Tooltip for smaller screens */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap lg:hidden">
                    {item.label}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* User Profile and Actions */}
          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {getUserName()}
                </p>
                <p className="text-xs text-gray-500">
                  {getUserEmail()}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-white/20 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;