import { Sparkles } from 'lucide-react';

const Loading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">MoneyWise</h2>
        <p className="text-gray-600">Loading your financial dashboard...</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
