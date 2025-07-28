// client/src/pages/AIAdvisor.tsx
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles, Clock, AlertCircle, Lightbulb } from 'lucide-react';

interface ChatMessage {
  id: string;
  message: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  tokensUsed?: number;
}

interface QuickQuestion {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const AIAdvisor: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions: QuickQuestion[] = [
    {
      id: 'emergency_fund',
      label: 'Emergency Fund',
      icon: AlertCircle,
      description: 'How can I create an emergency fund?'
    },
    {
      id: 'debt_management',
      label: 'Debt Management',
      icon: Clock,
      description: 'What\'s the best way to pay off debt?'
    },
    {
      id: 'investment_advice',
      label: 'Investment Advice',
      icon: Sparkles,
      description: 'Should I start investing with my current income?'
    },
    {
      id: 'budget_tips',
      label: 'Budget Tips',
      icon: Lightbulb,
      description: 'How can I stick to my budget better?'
    },
    {
      id: 'saving_strategies',
      label: 'Saving Strategies',
      icon: Bot,
      description: 'What are some effective saving strategies?'
    }
  ];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history and insights on component mount
  useEffect(() => {
    loadChatHistory();
    loadInsights();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/chat/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.history) {
          const formattedMessages: ChatMessage[] = data.data.history.map((msg: any, index: number) => ({
            id: `history-${index}`,
            message: msg.message,
            type: msg.type,
            timestamp: new Date(msg.timestamp),
            tokensUsed: msg.tokensUsed
          }));
          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/chat/insights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.insights) {
          setInsights(data.data.insights);
        }
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      message: message.trim(),
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token check:', token ? 'Token exists' : 'No token found');
      console.log('🔑 Token length:', token?.length);
      
      if (!token) {
        throw new Error('Authentication required - no token found');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      console.log('🌐 API URL:', apiUrl);
      console.log('📤 Sending message:', message.trim());

      const response = await fetch(`${apiUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.message || `HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          message: data.data.message,
          type: 'assistant',
          timestamp: new Date(),
          tokensUsed: data.data.tokensUsed
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.message || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        message: `Sorry, I'm having trouble right now. ${error instanceof Error ? error.message : 'Please try again later.'}`,
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = async (questionId: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/chat/quick-question`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: questionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process quick question');
      }

      const data = await response.json();
      if (data.success) {
        const userMessage: ChatMessage = {
          id: `quick-user-${Date.now()}`,
          message: data.data.question,
          type: 'user',
          timestamp: new Date()
        };

        const aiMessage: ChatMessage = {
          id: `quick-ai-${Date.now()}`,
          message: data.data.answer,
          type: 'assistant',
          timestamp: new Date(),
          tokensUsed: data.data.tokensUsed
        };

        setMessages(prev => [...prev, userMessage, aiMessage]);
      }
    } catch (error) {
      console.error('Error with quick question:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        message: `Sorry, I couldn't process that question. ${error instanceof Error ? error.message : 'Please try again.'}`,
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
          <MessageSquare className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          AI Financial Advisor
        </h2>
        <p className="text-gray-600 text-lg">Get personalized financial advice based on your spending patterns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Questions Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
              Quick Questions
            </h3>
            <div className="space-y-3">
              {quickQuestions.map((question) => {
                const Icon = question.icon;
                return (
                  <button
                    key={question.id}
                    onClick={() => handleQuickQuestion(question.id)}
                    disabled={isLoading}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform duration-200 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{question.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{question.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
              AI Insights
            </h3>
            {loadingInsights ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Start chatting to get personalized insights!</p>
            )}
            <button
              onClick={loadInsights}
              disabled={loadingInsights}
              className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {loadingInsights ? 'Loading...' : 'Refresh Insights'}
            </button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 flex flex-col h-[600px]">
            {/* Chat Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">MoneyWise AI</h3>
                  <p className="text-sm text-gray-500">Your personal financial assistant</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Welcome to your AI Financial Advisor!</h3>
                  <p className="text-gray-500">Ask me anything about budgeting, saving, or managing your finances.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.type === 'user' 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                          : 'bg-gradient-to-br from-purple-500 to-blue-500'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className={`p-4 rounded-2xl ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.message}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                          <span className={`text-xs ${message.type === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                            {formatTime(message.timestamp)}
                          </span>
                          {message.tokensUsed && (
                            <span className={`text-xs ${message.type === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                              {message.tokensUsed} tokens
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3 max-w-[80%]">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="p-4 bg-gray-100 rounded-2xl">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-200">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me about your finances..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;