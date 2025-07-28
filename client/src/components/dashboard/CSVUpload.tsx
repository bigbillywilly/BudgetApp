// client/src/components/dashboard/CSVUpload.tsx
import { useState } from 'react';
import { Upload, CheckCircle, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { apiService, type UploadResponse } from '../../services/api';

const CSVUpload = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please select a valid CSV file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setCsvFile(file);
    setError('');
    setUploadResult(null);
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      console.log('📤 Starting CSV upload...', file.name);
      
      const response = await apiService.uploadCSV(file);
      
      if (response.success && response.data) {
        console.log('✅ Upload successful:', response.data);
        setUploadResult(response.data);
        
        // Trigger transaction refresh across the app
        localStorage.setItem('transactions_updated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refresh_transactions'));
        
        // Also trigger a storage event for other tabs/components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'transactions_updated',
          newValue: Date.now().toString()
        }));
      } else {
        console.error('❌ Upload failed:', response.error);
        setError(response.error || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setError('An unexpected error occurred during upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCsvFile(null);
    setUploadResult(null);
    setError('');
    setIsProcessing(false);
  };

  const handleViewTransactions = () => {
    // Trigger a refresh of the parent component or navigate to transactions
    // You can emit an event or call a callback prop here
    window.location.reload();
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Upload className="w-5 h-5 mr-2 text-blue-500" />
        Upload Bank Statement
      </h3>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center">
        {!csvFile ? (
          /* Initial Upload State */
          <div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-700 font-semibold mb-2">Drop your CSV file here</p>
            <p className="text-sm text-gray-500 mb-6">Credit card or bank statement (Max 5MB)</p>
            
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="csv-upload"
              className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-full text-white bg-gradient-to-r from-blue-500 to-purple-600 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Choose File
            </label>
          </div>
        ) : (
          /* File Selected State */
          <div>
            {/* File Info */}
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                isProcessing 
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse' 
                  : uploadResult 
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                    : error 
                      ? 'bg-gradient-to-br from-red-400 to-red-500'
                      : 'bg-gradient-to-br from-blue-400 to-purple-500'
              }`}>
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                ) : uploadResult ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : error ? (
                  <AlertCircle className="w-8 h-8 text-white" />
                ) : (
                  <FileText className="w-8 h-8 text-white" />
                )}
              </div>
            </div>

            {/* File Name */}
            <p className="text-gray-900 font-semibold text-lg mb-2">{csvFile.name}</p>
            <p className="text-sm text-gray-500 mb-4">
              Size: {(csvFile.size / 1024).toFixed(1)} KB
            </p>

            {/* Status Messages */}
            {isProcessing && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <p className="text-yellow-800 font-medium flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                  Processing your financial data...
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-600 font-medium flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </p>
              </div>
            )}

            {uploadResult && !isProcessing && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-green-700 font-medium flex items-center justify-center mb-2">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Upload successful!
                </p>
                <div className="text-sm text-green-600 space-y-1">
                  <p>Upload ID: {uploadResult.uploadId}</p>
                  <p>File: {uploadResult.filename}</p>
                  <p>Size: {(uploadResult.size / 1024).toFixed(1)} KB</p>
                  <p>Date: {new Date(uploadResult.uploadDate).toLocaleString()}</p>
                  {uploadResult.processedTransactions && (
                    <p>Processed {uploadResult.processedTransactions} transactions</p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 justify-center">
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload Another
              </button>
              {uploadResult && (
                <button
                  onClick={handleViewTransactions}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                >
                  View Transactions
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 CSV Upload Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Export your bank/credit card statement as CSV</li>
          <li>• Ensure columns include: Date, Description, Amount</li>
          <li>• File size limit: 5MB</li>
          <li>• Transactions will be automatically categorized</li>
          <li>• Supported formats: Transaction Date, Posted Date, Description, Category, Debit, Credit</li>
        </ul>
      </div>
    </div>
  );
};

export default CSVUpload; 