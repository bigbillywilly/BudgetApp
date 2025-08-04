// Smart CSV Upload component with automatic transaction categorization
// Handles file validation, duplicate detection, and budget analysis
import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3,
  PieChart,
  Target,
  Calendar,
  CreditCard,
  RefreshCw,
  Shield,
  XCircle,
  Info
} from 'lucide-react';
import { apiService, UploadResponse } from '../../services/api';
import { useBudget } from '../../context/budgetContext';

// Unified spending categories matching backend categorization system
const SPENDING_CATEGORIES = {
  'Essential Spending': [
    'Grocery',
    'Health', 
    'Wifi / Utilities',
    'Household',
    'Laundry'
  ],
  'Transportation': [
    'Rideshare',
    'Travel'
  ],
  'Food & Drinks': [
    'Dining',
    'Drinks/Dessert',
    'Alcohol'
  ],
  'Lifestyle': [
    'Fashion',
    'Beauty',
    'Gym',
    'Entertainment',
    'Subscription'
  ],
  'Financial': [
    'Credit',
    'Income'
  ],
  'Shopping & Gifts': [
    'Merchandise',
    'Gifts'
  ],
  'Other': [
    'Other'
  ]
};

// Enhanced categorization using actual spending categories
const categorizeTransaction = (description: string, amount?: number): string => {
  const desc = description.toLowerCase();
  
  // Category matching rules for automatic transaction categorization
  const categoryRules = {
    // Income recognition including salary deposits
    'Income': [
      'mufg', 'salary', 'paycheck', 'deposit', 'income', 'pay', 'wage',
      'direct deposit', 'payroll', 'earnings', 'compensation'
    ],
    
    // Alcohol purchases
    'Alcohol': [
      'bar', 'brewery', 'wine', 'liquor', 'beer', 'spirits', 'cocktail',
      'pub', 'tavern', 'distillery', 'total wine', 'bevmo'
    ],
    
    // Beauty and personal care
    'Beauty': [
      'sephora', 'ulta', 'salon', 'nail', 'spa', 'cosmetic', 'makeup',
      'skincare', 'hair', 'beauty', 'barbershop', 'stylist'
    ],
    
    // Household items and home improvement
    'Household': [
      'home depot', 'lowes', 'ikea', 'bed bath', 'target home', 'furniture',
      'cleaning', 'detergent', 'toilet paper', 'household', 'supplies'
    ],
    
    // Credit card payments and financial services
    'Credit': [
      'credit card', 'payment', 'cc payment', 'balance transfer', 'interest',
      'finance charge', 'late fee'
    ],
    
    // Restaurant and dining expenses
    'Dining': [
      'restaurant', 'cafe', 'pizza', 'burger', 'sushi', 'thai', 'chinese',
      'mexican', 'italian', 'diner', 'bistro', 'grill', 'kitchen',
      'mcdonald', 'burger king', 'taco bell', 'kfc', 'subway', 'chipotle',
      'panera', 'chick-fil-a', 'wendys', 'five guys', 'shake shack'
    ],
    
    // Coffee, drinks, and dessert purchases
    'Drinks/Dessert': [
      'starbucks', 'coffee', 'tea', 'dunkin', 'peet', 'caribou',
      'ice cream', 'frozen yogurt', 'dessert', 'bakery', 'donut',
      'smoothie', 'juice', 'boba', 'frappuccino'
    ],
    
    // Entertainment and subscription services
    'Entertainment': [
      'movie', 'cinema', 'theater', 'concert', 'show', 'ticket',
      'netflix', 'spotify', 'hulu', 'disney', 'amazon prime',
      'youtube', 'game', 'steam', 'playstation', 'xbox', 'nintendo'
    ],
    
    // Fashion and clothing purchases
    'Fashion': [
      'clothing', 'shoes', 'dress', 'shirt', 'pants', 'jacket',
      'nike', 'adidas', 'zara', 'h&m', 'gap', 'old navy', 'uniqlo',
      'nordstrom', 'macys', 'forever 21', 'urban outfitters'
    ],
    
    // Gift purchases and special occasions
    'Gifts': [
      'gift', 'present', 'amazon gift', 'gift card', 'birthday',
      'holiday', 'christmas', 'valentine', 'anniversary'
    ],
    
    // Grocery and food shopping
    'Grocery': [
      'grocery', 'supermarket', 'safeway', 'kroger', 'publix',
      'whole foods', 'trader joe', 'aldi', 'costco grocery',
      'food lion', 'harris teeter', 'giant food', 'wegmans'
    ],
    
    // Gym and fitness memberships
    'Gym': [
      'gym', 'fitness', '24 hour fitness', 'planet fitness', 'la fitness',
      'equinox', 'gold gym', 'yoga', 'pilates', 'crossfit',
      'personal trainer', 'membership'
    ],
    
    // Healthcare and medical expenses
    'Health': [
      'pharmacy', 'cvs', 'walgreens', 'rite aid', 'doctor', 'medical',
      'hospital', 'clinic', 'dentist', 'dental', 'vision', 'health',
      'prescription', 'medicine', 'urgent care'
    ],
    
    // Laundry and dry cleaning services
    'Laundry': [
      'laundry', 'dry clean', 'wash', 'laundromat', 'cleaners'
    ],
    
    // General merchandise and online shopping
    'Merchandise': [
      'amazon', 'ebay', 'walmart', 'target', 'best buy', 'apple store',
      'shopping', 'retail', 'store', 'mall', 'outlet'
    ],
    
    // Rideshare and taxi services
    'Rideshare': [
      'uber', 'lyft', 'taxi', 'cab', 'rideshare', 'ride share'
    ],
    
    // Subscription and recurring services
    'Subscription': [
      'subscription', 'monthly', 'netflix', 'spotify', 'hulu', 'disney+',
      'amazon prime', 'apple music', 'youtube premium', 'adobe',
      'microsoft', 'google', 'dropbox', 'icloud', 'membership'
    ],
    
    // Travel and transportation expenses
    'Travel': [
      'airline', 'flight', 'hotel', 'motel', 'airbnb', 'booking',
      'expedia', 'rental car', 'hertz', 'avis', 'enterprise',
      'gas', 'fuel', 'parking', 'toll', 'train', 'bus', 'metro'
    ],
    
    // Internet, utilities, and communication services
    'Wifi / Utilities': [
      'internet', 'wifi', 'comcast', 'xfinity', 'verizon', 'at&t',
      'spectrum', 'cox', 'phone', 'cell', 'tmobile', 'sprint',
      'electric', 'gas company', 'water', 'utility', 'power'
    ]
  };

  // Prioritize income detection for positive amounts
  if (amount && amount > 0) {
    const incomeKeywords = categoryRules['Income'];
    if (incomeKeywords.some(keyword => desc.includes(keyword))) {
      return 'Income';
    }
  }

  // Find best matching category for expenses
  for (const [categoryName, keywords] of Object.entries(categoryRules)) {
    if (categoryName === 'Income') continue; // Already checked above
    
    if (keywords.some(keyword => desc.includes(keyword))) {
      return categoryName;
    }
  }

  // Default category for unmatched transactions
  return 'Other';
};

// Category icon mapping for visual representation
const getCategoryIcon = (category: string): string => {
  const icons: { [key: string]: string } = {
    'Alcohol': '🍷',
    'Beauty': '💄',
    'Household': '🏠',
    'Credit': '💳',
    'Dining': '🍽️',
    'Drinks/Dessert': '☕',
    'Entertainment': '🎬',
    'Fashion': '👕',
    'Gifts': '🎁',
    'Grocery': '🛒',
    'Gym': '💪',
    'Health': '🏥',
    'Laundry': '🧺',
    'Merchandise': '🛍️',
    'Other': '📦',
    'Rideshare': '🚗',
    'Subscription': '📱',
    'Travel': '✈️',
    'Wifi / Utilities': '📡',
    'Income': '💰'
  };
  return icons[category] || '📦';
};

interface SmartCSVUploadProps {
  onUploadComplete?: (data: UploadResponse) => void;
  className?: string;
}

export const SmartCSVUpload: React.FC<SmartCSVUploadProps> = ({ 
  onUploadComplete,
  className = ""
}) => {
  const { budget, refreshBudget } = useBudget();
  
  // Component state management for upload process
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);

  // Handle drag and drop events for file upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Process dropped files
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file input selection
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Main file processing logic with validation
  const handleFile = async (file: File) => {
    // Ensure budget is set before processing transactions
    if (!budget.hasSetBudget) {
      setError('Please set up your monthly budget first before uploading transactions');
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadResult(null);

    try {
      console.log('Uploading CSV file with categorization system:', file.name);
      
      const response = await apiService.uploadCSV(file);

      if (response.success && response.data) {
        console.log('CSV upload successful with categories:', response.data);
        
        setUploadResult(response.data);
        onUploadComplete?.(response.data);
        
        // Refresh budget context after successful upload
        await refreshBudget();
        
      } else {
        setError(response.error || 'Upload failed');
        console.error('CSV upload failed:', response.error);
      }
    } catch (err) {
      console.error('CSV upload error:', err);
      setError('An unexpected error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  // Utility functions for data formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Determine visual styling based on budget status
  const getStatusColor = (percentage: number, isOverBudget: boolean) => {
    if (isOverBudget) return 'from-red-500 to-red-600';
    if (percentage > 80) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-blue-500';
  };

  // Calculate duplicate detection status colors
  const getDuplicateStatusColor = (duplicatesFound: number, totalTransactions: number) => {
    const duplicateRate = totalTransactions > 0 
      ? (duplicatesFound / totalTransactions) * 100 
      : 0;
    
    if (duplicateRate === 100) return 'from-blue-500 to-blue-600'; // All duplicates
    if (duplicateRate > 50) return 'from-yellow-500 to-orange-500'; // Many duplicates
    if (duplicateRate > 0) return 'from-green-500 to-blue-500'; // Some duplicates
    return 'from-green-500 to-green-600'; // No duplicates
  };

  // Generate duplicate status message based on results
  const getDuplicateStatusMessage = (duplicatesFound: number, newTransactionsAdded: number, totalTransactions: number) => {
    if (duplicatesFound === 0) {
      return 'All transactions were new!';
    }
    
    if (newTransactionsAdded === 0) {
      return 'All transactions already exist in your account';
    }
    
    const duplicateRate = (duplicatesFound / totalTransactions) * 100;
    return `Prevented ${duplicatesFound} duplicates (${duplicateRate.toFixed(0)}%)`;
  };

  return (
    <div className={`bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 ${className}`}>
      {/* Component header with branding */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Smart CSV Upload</h3>
        <p className="text-gray-600">Upload your bank statement with automatic categorization using your personal categories</p>
        
        {/* Budget status indicator */}
        {budget.hasSetBudget && (
          <div className="mt-3 inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
            <CheckCircle className="w-4 h-4 mr-1" />
            Budget set: {formatCurrency(budget.availableToSpend)} available to spend
          </div>
        )}
      </div>

      {/* Upload interface - only show if no results yet */}
      {!uploadResult && (
        <>
          {/* Budget setup requirement warning */}
          {!budget.hasSetBudget && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                <div>
                  <p className="text-yellow-800 font-medium">Budget Setup Required</p>
                  <p className="text-yellow-700 text-sm">
                    Please set up your monthly budget first to get spending analysis
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main file upload area with drag and drop */}
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : 
                !budget.hasSetBudget ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => budget.hasSetBudget && !isUploading && document.getElementById('csv-file-input')?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              disabled={isUploading || !budget.hasSetBudget}
            />
            
            {/* Upload state: processing vs idle */}
            {isUploading ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <div>
                  <p className="text-lg font-medium text-gray-700">Processing your CSV...</p>
                  <p className="text-sm text-gray-500">Categorizing with your personal spending categories</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    {!budget.hasSetBudget ? 'Set up your budget first' :
                     dragActive ? 'Drop your CSV file here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-gray-500">CSV files up to 5MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Error message display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Instructions for CSV upload with category information */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              What happens with your categories?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• MUFG salary will be automatically recognized as Income</li>
              <li>• Spending categorized into your actual categories (Dining, Rideshare, etc.)</li>
              <li>• Duplicate transactions will be detected and prevented</li>
              <li>• Budget analysis against your {formatCurrency(budget.availableToSpend)} monthly budget</li>
              <li>• Categories organized by type: Essential, Food & Drinks, Lifestyle, etc.</li>
            </ul>
          </div>
        </>
      )}

      {/* Upload results display with comprehensive analysis */}
      {uploadResult && (
        <div className="space-y-6">
          {/* Success notification header */}
          <div className="text-center bg-green-50 border border-green-200 rounded-xl p-4">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-bold text-green-900">Upload Complete!</h4>
            <p className="text-sm text-green-700">
              Processed {uploadResult.filename} using your personal categories
            </p>
            <div className="flex items-center justify-center space-x-4 mt-2 text-xs text-green-600">
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(uploadResult.summary.dateRange.start)} - {formatDate(uploadResult.summary.dateRange.end)}
              </span>
              <span className="flex items-center">
                <CreditCard className="w-3 h-3 mr-1" />
                {uploadResult.summary.totalTransactions} total transactions
              </span>
            </div>
          </div>

          {/* Duplicate detection and prevention summary */}
          {uploadResult.duplicateInfo && (
            <div className={`bg-gradient-to-r ${getDuplicateStatusColor(
              uploadResult.duplicateInfo.duplicatesFound || 0, 
              uploadResult.duplicateInfo.totalTransactionsInFile || 0
            )} rounded-2xl p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Duplicate Prevention
                </h4>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {uploadResult.duplicateInfo.duplicatesFound || 0}
                  </div>
                  <div className="text-sm opacity-90">duplicates</div>
                </div>
              </div>

              {/* Transaction processing statistics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold">
                    {uploadResult.duplicateInfo.totalTransactionsInFile || 0}
                  </div>
                  <div className="text-sm opacity-90">In File</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-200">
                    {uploadResult.duplicateInfo.newTransactionsAdded || 0}
                  </div>
                  <div className="text-sm opacity-90">Added</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-200">
                    {uploadResult.duplicateInfo.duplicatesSkipped || 0}
                  </div>
                  <div className="text-sm opacity-90">Skipped</div>
                </div>
              </div>

              {/* Duplicate prevention status message */}
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-sm font-medium">
                  {getDuplicateStatusMessage(
                    uploadResult.duplicateInfo.duplicatesFound || 0,
                    uploadResult.duplicateInfo.newTransactionsAdded || 0,
                    uploadResult.duplicateInfo.totalTransactionsInFile || 0
                  )}
                </p>
              </div>

              {/* Toggle for duplicate details display */}
              {uploadResult.duplicateInfo.duplicatesFound && uploadResult.duplicateInfo.duplicatesFound > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowDuplicateDetails(!showDuplicateDetails)}
                    className="flex items-center text-sm bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 transition-colors duration-200"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    {showDuplicateDetails ? 'Hide' : 'Show'} Duplicate Details
                    <RefreshCw className={`w-4 h-4 ml-2 transition-transform duration-200 ${showDuplicateDetails ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Budget impact analysis */}
          {uploadResult.budgetAnalysis && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900">Budget Analysis</h4>
                {uploadResult.budgetAnalysis.isOverBudget ? (
                  <TrendingDown className="w-6 h-6 text-red-500" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-green-500" />
                )}
              </div>

              {/* Budget vs spending comparison */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Available to Spend</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(uploadResult.budgetAnalysis.availableToSpend)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">From your budget setup</p>
                </div>
                <div className="bg-white/50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">New Spending</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(uploadResult.budgetAnalysis.totalSpent)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">From new transactions only</p>
                </div>
              </div>

              {/* Visual budget usage indicator */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Budget Usage (New Transactions)</span>
                  <span>{formatPercentage(uploadResult.budgetAnalysis.percentageUsed)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r ${getStatusColor(
                      uploadResult.budgetAnalysis.percentageUsed,
                      uploadResult.budgetAnalysis.isOverBudget
                    )}`}
                    style={{
                      width: `${Math.min(uploadResult.budgetAnalysis.percentageUsed, 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Budget remaining status */}
              <div className="bg-white/50 rounded-xl p-3">
                <p className="text-sm font-medium text-gray-800">
                  {uploadResult.budgetAnalysis.remaining >= 0 
                    ? `${formatCurrency(uploadResult.budgetAnalysis.remaining)} remaining in budget`
                    : `Over budget by ${formatCurrency(Math.abs(uploadResult.budgetAnalysis.remaining))}`
                  }
                </p>
              </div>
            </div>
          )}

          {/* High-level transaction summary */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Transaction Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(uploadResult.summary.totalCredits)}
                </p>
                <p className="text-sm text-gray-600">Income (MUFG + Others)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(uploadResult.summary.totalDebits)}
                </p>
                <p className="text-sm text-gray-600">Expenses</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${
                  uploadResult.summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(uploadResult.summary.netAmount)}
                </p>
                <p className="text-sm text-gray-600">Net Amount</p>
              </div>
            </div>
            
            {/* Transaction period and count */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Period: {formatDate(uploadResult.summary.dateRange.start)} to {formatDate(uploadResult.summary.dateRange.end)}</span>
                <span>{uploadResult.summary.totalTransactions} transactions</span>
              </div>
            </div>
          </div>

          {/* Detailed spending breakdown by category */}
          {Object.keys(uploadResult.categoryBreakdown).length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900">Spending by Your Categories</h4>
                <PieChart className="w-5 h-5 text-gray-500" />
              </div>
              
              {/* Category spending breakdown with visual indicators */}
              <div className="space-y-3">
                {Object.entries(uploadResult.categoryBreakdown)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .slice(0, 10)
                  .map(([category, data]) => {
                    const percentage = uploadResult.summary.totalDebits > 0 
                      ? (data.total / uploadResult.summary.totalDebits) * 100 
                      : 0;
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <span>{getCategoryIcon(category)}</span>
                            {category}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">
                              {formatCurrency(data.total)}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({formatPercentage(percentage)})
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">{data.count} transactions</p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* AI-generated insights about spending patterns */}
          {uploadResult.insights && uploadResult.insights.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Smart Insights</h4>
              <div className="space-y-3">
                {uploadResult.insights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons for next steps */}
          <div className="flex space-x-4">
            <button
              onClick={() => {
                setUploadResult(null);
                setError('');
                setShowDuplicateDetails(false);
                // Reset file input
                const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
              }}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Upload Another File
            </button>
            <button
              onClick={() => {
                // Navigate to transactions page to view details
                if (window.location.hash) {
                  window.location.hash = '#transactions';
                } else {
                  console.log('Navigate to transactions page');
                }
              }}
              className="flex-1 bg-white text-gray-700 py-3 px-6 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 transition-all duration-300"
            >
              View All Transactions
            </button>
          </div>
        </div>
      )}

      {/* Development-only debug information */}
      {import.meta.env.DEV && uploadResult && uploadResult.duplicateInfo && (
        <div className="mt-6 p-4 bg-gray-800 text-green-400 text-xs rounded-lg font-mono">
          <div className="text-white font-bold mb-2">CSV Upload Debug Info (Your Categories)</div>
          <div>Total in File: {uploadResult.duplicateInfo.totalTransactionsInFile || 0}</div>
          <div>New Added: {uploadResult.duplicateInfo.newTransactionsAdded || 0}</div>
          <div>Duplicates Found: {uploadResult.duplicateInfo.duplicatesFound || 0}</div>
          <div>Categories Used: {Object.keys(uploadResult.categoryBreakdown).join(', ')}</div>
          <div>MUFG Income Detected: {uploadResult.categoryBreakdown['Income'] ? 'Yes' : 'No'}</div>
          <div>Duplicate Rate: {uploadResult.duplicateInfo.totalTransactionsInFile && uploadResult.duplicateInfo.totalTransactionsInFile > 0 
            ? ((uploadResult.duplicateInfo.duplicatesFound || 0) / uploadResult.duplicateInfo.totalTransactionsInFile * 100).toFixed(1) + '%'
            : '0%'}</div>
        </div>
      )}
    </div>
  );
};

export default SmartCSVUpload;