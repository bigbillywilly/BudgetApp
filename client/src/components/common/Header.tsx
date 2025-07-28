import { Brain, History, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  currentPage: 'dashboard' | 'previous' | 'advisor';
  setCurrentPage: (page: 'dashboard' | 'previous' | 'advisor') => void;
}

const Header = ({ currentPage, setCurrentPage }: HeaderProps) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <div className="relative bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          
          {/* Brand Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                <span className="text-white text-xl font-bold">💰</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-ping"></div>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                MoneyWise
              </h1>
              <p className="text-sm text-gray-600 font-medium">Smart financial tracking</p>
            </div>
          </div>
          
          {/* Navigation and User Section */}
          <div className="flex items-center space-x-4">
            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center space-x-1 bg-white/50 rounded-full p-1">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${currentPage === 'dashboard'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Dashboard
              </button>
              
              <button
                onClick={() => setCurrentPage('previous')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${currentPage === 'previous'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Previous Months</span>
              </button>
              
              <button
                onClick={() => setCurrentPage('advisor')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${currentPage === 'advisor'
                  ? 'bg-gray-700 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>AI Advisor</span>
              </button>
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center space-x-2 bg-white/50 rounded-full px-4 py-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700 font-medium">
                {user?.name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="ml-2 p-1 text-gray-600 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;