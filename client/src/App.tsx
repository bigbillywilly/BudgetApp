import { SetStateAction, useState, useEffect } from 'react';
import { Upload, DollarSign, TrendingUp, PieChart, AlertCircle, CheckCircle, Sparkles, Target, Wallet, CreditCard, Brain, Send, Bot, User, History, Calendar, FileText, BarChart3, ChevronDown } from 'lucide-react';

function App() {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [income, setIncome] = useState('');
    const [fixedExpenses, setFixedExpenses] = useState('');
    const [savingsGoal, setSavingsGoal] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [monthlyData, setMonthlyData] = useState<any>({});
    const [selectedMonth, setSelectedMonth] = useState('');
    const [chatMessages, setChatMessages] = useState([
        {
            type: 'bot',
            message: "Hi! I'm your AI Financial Advisor. I can help you with budgeting tips, investment advice, debt management, and personalized financial strategies. What would you like to discuss?",
            timestamp: new Date().toLocaleTimeString()
        }
    ]);
    const [currentMessage, setCurrentMessage] = useState('');

    const availableToSpend = Math.max(0, (parseFloat(income) || 0) - (parseFloat(fixedExpenses) || 0) - (parseFloat(savingsGoal) || 0));

    const getCurrentMonthKey = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    const formatMonthDisplay = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    const getPreviousMonths = () => {
        const currentMonth = getCurrentMonthKey();
        return Object.keys(monthlyData)
            .filter(month => month !== currentMonth && monthlyData[month])
            .sort()
            .reverse();
    };

    const calculateHistoricalSpend = (data: any) => {
        return Math.max(0, (parseFloat(data.income) || 0) - (parseFloat(data.fixedExpenses) || 0) - (parseFloat(data.savingsGoal) || 0));
    };

    useEffect(() => {
        const saved = localStorage.getItem('moneywise_data');
        if (saved) {
            setMonthlyData(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        const currentMonth = getCurrentMonthKey();
        const currentData = {
            income,
            fixedExpenses,
            savingsGoal,
            csvFile: csvFile ? { 
                name: csvFile.name,
                uploadDate: new Date().toISOString()
            } : null,
            chatHistory: chatMessages,
            lastUpdated: new Date().toISOString()
        };

        const updatedData = {
            ...monthlyData,
            [currentMonth]: currentData
        };

        setMonthlyData(updatedData);
        localStorage.setItem('moneywise_data', JSON.stringify(updatedData));
    }, [income, fixedExpenses, savingsGoal, csvFile, chatMessages]);

    const handleSendMessage = () => {
        if (currentMessage.trim()) {
            const userMessage = {
                type: 'user',
                message: currentMessage,
                timestamp: new Date().toLocaleTimeString()
            };

            setChatMessages(prev => [...prev, userMessage]);

            // TODO: Replace with real AI API call
            setTimeout(() => {
                const botMessage = {
                    type: 'bot',
                    message: "I'm a demo response. Will implement later.",
                    timestamp: new Date().toLocaleTimeString()
                };

                setChatMessages(prev => [...prev, botMessage]);
            }, 1000);

            setCurrentMessage('');
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/csv') {
            setCsvFile(file);
            setIsProcessing(true);
            // TODO: Replace with real CSV processing
            setTimeout(() => setIsProcessing(false), 2000);
        }
    };

    const handleKeyPress = (e: { key: string; shiftKey: any; preventDefault: () => void; }) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleQuickQuestion = (question: SetStateAction<string>) => {
        setCurrentMessage(question);
        setTimeout(() => handleSendMessage(), 100);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-gray-300/10 to-gray-400/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-gray-400/10 to-gray-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Header */}
            <div className="relative bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                                    <span className="text-white text-xl font-bold">E💵</span>
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
                        <div className="flex items-center space-x-4">
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
                            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 bg-white/50 px-4 py-2 rounded-full">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span>Live tracking active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {currentPage === 'dashboard' ? (
                    <>
                        {/* Financial Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                            <div className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <TrendingUp className="w-5 h-5 text-gray-500" />
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

                            <div className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <AlertCircle className="w-5 h-5 text-gray-600" />
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

                            <div className="group bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Target className="w-5 h-5 text-gray-500" />
                                            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Savings Goal</p>
                                        </div>
                                        <div className="relative">
                                            <span className="text-2xl font-bold text-gray-400">$</span>
                                            <input
                                                type="number"
                                                value={savingsGoal}
                                                onChange={(e) => setSavingsGoal(e.target.value)}
                                                placeholder="1,000"
                                                className="text-2xl font-bold text-gray-900 border-none outline-none bg-transparent ml-1 placeholder-gray-400 no-spinner"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="group bg-gradient-to-br from-gray-600 to-gray-800 rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <DollarSign className="w-5 h-5 text-white/80" />
                                            <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">Available to Spend</p>
                                        </div>
                                        <p className="text-3xl font-bold">
                                            ${Number(availableToSpend).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <span className="text-white text-xl font-bold">E💵</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* CSV Upload Section */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
                                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                        <Upload className="w-5 h-5 mr-2 text-blue-500" />
                                        Upload Expenses
                                    </h3>
                                    <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center hover:border-blue-500 transition-all duration-300 hover:bg-blue-50/50 group">
                                        {!csvFile ? (
                                            <div>
                                                <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <Upload className="w-8 h-8 text-white" />
                                                </div>
                                                <p className="text-gray-700 font-semibold mb-2">Drop your CSV file here</p>
                                                <p className="text-sm text-gray-500 mb-6">Credit card or bank statement</p>
                                                <input
                                                    type="file"
                                                    accept=".csv"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                    id="csv-upload"
                                                />
                                                <label
                                                    htmlFor="csv-upload"
                                                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-full text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                                                >
                                                    Choose File
                                                </label>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-gray-900 font-semibold text-lg">{csvFile?.name}</p>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    {isProcessing ? (
                                                        <span className="flex items-center justify-center">
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                                            Processing...
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-600 font-medium">✨ Ready to analyze</span>
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Spending Breakdown */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                            <PieChart className="w-5 h-5 mr-2 text-purple-500" />
                                            Spending by Category
                                        </h3>
                                        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                            Upload CSV to view
                                        </div>
                                    </div>

                                    <div className="text-center py-16">
                                        <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                            <PieChart className="w-12 h-12 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 text-lg">Upload a CSV file to see your spending breakdown</p>
                                        <p className="text-gray-400 text-sm mt-2">Drag and drop your file to the left to get started</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : currentPage === 'previous' ? (
                    /* Previous Months Page */
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

                        {getPreviousMonths().length === 0 ? (
                            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-12 border border-white/20 text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <Calendar className="w-12 h-12 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Previous Data</h3>
                                <p className="text-gray-600 mb-6">Start tracking your finances on the dashboard to see historical data here.</p>
                                <button
                                    onClick={() => setCurrentPage('dashboard')}
                                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                                >
                                    <BarChart3 className="w-5 h-5 mr-2" />
                                    Go to Dashboard
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Month Selector */}
                                <div className="mb-8">
                                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                                        <div className="flex items-center space-x-4">
                                            <Calendar className="w-5 h-5 text-gray-600" />
                                            <span className="text-sm font-medium text-gray-700">Select Month:</span>
                                            <div className="relative">
                                                <select
                                                    value={selectedMonth}
                                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                                    className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                >
                                                    <option value="">Choose a month...</option>
                                                    {getPreviousMonths().map(month => (
                                                        <option key={month} value={month}>
                                                            {formatMonthDisplay(month)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Historical Data Display */}
                                {selectedMonth && monthlyData[selectedMonth] ? (
                                    <div className="space-y-8">
                                        {/* Financial Overview for Selected Month */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Income</p>
                                                </div>
                                                <p className="text-3xl font-bold text-gray-900">
                                                    ${Number(monthlyData[selectedMonth].income || 0).toLocaleString()}
                                                </p>
                                            </div>

                                            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Fixed Expenses</p>
                                                </div>
                                                <p className="text-3xl font-bold text-gray-900">
                                                    ${Number(monthlyData[selectedMonth].fixedExpenses || 0).toLocaleString()}
                                                </p>
                                            </div>

                                            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <Target className="w-5 h-5 text-blue-500" />
                                                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Savings Goal</p>
                                                </div>
                                                <p className="text-3xl font-bold text-gray-900">
                                                    ${Number(monthlyData[selectedMonth].savingsGoal || 0).toLocaleString()}
                                                </p>
                                            </div>

                                            <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl shadow-xl p-6 border border-white/20 text-white">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <DollarSign className="w-5 h-5 text-white/80" />
                                                    <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">Available to Spend</p>
                                                </div>
                                                <p className="text-3xl font-bold">
                                                    ${calculateHistoricalSpend(monthlyData[selectedMonth]).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Additional Information */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* CSV Upload Info */}
                                            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
                                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                                    <FileText className="w-5 h-5 mr-2 text-blue-500" />
                                                    Uploaded Files
                                                </h3>
                                                {monthlyData[selectedMonth].csvFile ? (
                                                    <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-2xl border border-green-200">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                                                            <CheckCircle className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {monthlyData[selectedMonth].csvFile.name}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                Uploaded: {new Date(monthlyData[selectedMonth].csvFile.uploadDate).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8">
                                                        <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                            <Bot className="w-8 h-8 text-gray-400" />
                                                        </div>
                                                        <p className="text-gray-500">No AI conversations this month</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Last Updated Info */}
                                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                                            <div className="flex items-center justify-between text-sm text-gray-600">
                                                <span>Last updated: {new Date(monthlyData[selectedMonth].lastUpdated).toLocaleString()}</span>
                                                <span className="flex items-center space-x-1">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    <span>Data saved locally</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Overview of All Months */
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-gray-900 mb-6">Monthly Overview</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {getPreviousMonths().map(month => {
                                                const data = monthlyData[month];
                                                const availableSpend = calculateHistoricalSpend(data);
                                                return (
                                                    <div 
                                                        key={month}
                                                        className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                                                        onClick={() => setSelectedMonth(month)}
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="text-lg font-bold text-gray-900">
                                                                {formatMonthDisplay(month)}
                                                            </h4>
                                                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                                <Calendar className="w-5 h-5 text-white" />
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600">Income:</span>
                                                                <span className="font-semibold text-green-600">
                                                                    ${Number(data.income || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600">Expenses:</span>
                                                                <span className="font-semibold text-red-600">
                                                                    ${Number(data.fixedExpenses || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-600">Savings:</span>
                                                                <span className="font-semibold text-blue-600">
                                                                    ${Number(data.savingsGoal || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="pt-2 border-t border-gray-200">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm font-medium text-gray-700">Available:</span>
                                                                    <span className="font-bold text-lg text-gray-900">
                                                                        ${availableSpend.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                                                            <span className="flex items-center space-x-1">
                                                                {data.csvFile && (
                                                                    <>
                                                                        <FileText className="w-3 h-3" />
                                                                        <span>CSV uploaded</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                            <span>Click to view details</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    /* AI Advisor Page */
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

                        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                            {/* Chat Messages */}
                            <div className="h-96 overflow-y-auto p-6 space-y-4">
                                {chatMessages.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${msg.type === 'user'
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                : 'bg-gradient-to-br from-purple-500 to-pink-600'
                                                }`}>
                                                {msg.type === 'user' ? (
                                                    <User className="w-4 h-4 text-white" />
                                                ) : (
                                                    <Bot className="w-4 h-4 text-white" />
                                                )}
                                            </div>
                                            <div className={`p-4 rounded-2xl shadow-lg ${msg.type === 'user'
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                                : 'bg-white border border-gray-200'
                                                }`}>
                                                <p className={`text-sm ${msg.type === 'user' ? 'text-white' : 'text-gray-800'}`}>
                                                    {msg.message}
                                                </p>
                                                <p className={`text-xs mt-2 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                                                    {msg.timestamp}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Message Input */}
                            <div className="border-t border-gray-200 bg-white/50 backdrop-blur-sm p-6">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-1 relative">
                                        <textarea
                                            value={currentMessage}
                                            onChange={(e) => setCurrentMessage(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Ask me about budgeting, investing, saving strategies..."
                                            className="w-full p-4 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white/80 backdrop-blur-sm"
                                            rows={2}
                                        />
                                    </div>
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!currentMessage.trim()}
                                        className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        <Send className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Questions */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleQuickQuestion("How can I create an emergency fund?")}
                                className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 text-left group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Target className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Emergency Fund</p>
                                        <p className="text-sm text-gray-600">How to build financial security</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleQuickQuestion("What's the best way to pay off debt?")}
                                className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 text-left group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <CreditCard className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Debt Management</p>
                                        <p className="text-sm text-gray-600">Strategies to become debt-free</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleQuickQuestion("Should I start investing with my current income?")}
                                className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 text-left group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <TrendingUp className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Investment Advice</p>
                                        <p className="text-sm text-gray-600">When and how to start investing</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleQuickQuestion("How can I stick to my budget better?")}
                                className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 text-left group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Wallet className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Budget Tips</p>
                                        <p className="text-sm text-gray-600">Stay on track with your finances</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
                                                      