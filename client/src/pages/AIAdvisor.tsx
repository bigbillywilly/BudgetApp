import { Brain } from 'lucide-react';

const AIAdvisor = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          AI Financial Advisor
        </h2>
        <p className="text-gray-600 text-lg">Get personalized financial advice and insights</p>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
        <p className="text-gray-600 text-center">Coming soon... Chat interface will be built here!</p>
      </div>
    </div>
  );
};

export default AIAdvisor;