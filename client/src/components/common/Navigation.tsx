// Navigation component for switching between main application sections
// Provides branded header with dashboard and AI advisor navigation
import { useState } from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface NavigationProps {
    currentPage: 'dashboard' | 'advisor';
    setCurrentPage: (page: 'dashboard' | 'advisor') => void;
}

const Navigation = ({ currentPage, setCurrentPage }: NavigationProps) => {
    return (
        <div className="relative bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6">
                    {/* Application branding section with logo and title */}
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            {/* Main logo with hover animation */}
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            {/* Activity indicator pulse animation */}
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-ping"></div>
                        </div>
                        {/* Application title and subtitle */}
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                MoneyWise
                            </h1>
                            <p className="text-sm text-gray-600 font-medium">Smart financial tracking</p>
                        </div>
                    </div>

                    {/* Main navigation toggle between dashboard and advisor */}
                    <nav className="flex items-center space-x-1 bg-white/50 rounded-full p-1">
                        {/* Dashboard navigation button */}
                        <button
                            onClick={() => setCurrentPage('dashboard')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${currentPage === 'dashboard'
                                    ? 'bg-gray-800 text-white shadow-lg'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                }`}
                        >
                            Dashboard
                        </button>
                        {/* AI Advisor navigation button with icon */}
                        <button
                            onClick={() => setCurrentPage('advisor')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${currentPage === 'advisor'
                                    ? 'bg-purple-500 text-white shadow-lg'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                }`}
                        >
                            <Brain className="w-4 h-4" />
                            <span>AI Advisor</span>
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Navigation;