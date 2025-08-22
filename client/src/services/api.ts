/**
 * API Service for Budget Application Frontend
 * 
 * Provides centralized HTTP client for all backend API communication.
 * Handles authentication, token management, request/response processing,
 * and automatic token refresh for the MoneyWise financial tracking application.
 */

// Core API response structure matching backend format
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string; // Specific error codes like TOKEN_EXPIRED
}

// Authentication response types
interface LoginData {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified?: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface RegisterData {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified?: boolean;
  };
  message?: string;
}

// CSV upload response with comprehensive transaction analysis
interface UploadResponse {
  uploadId: string;
  filename: string;
  size: number;
  uploadDate: string;
  processedTransactions: number;
  summary: {
    totalTransactions: number;
    totalDebits: number;
    totalCredits: number;
    netAmount: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  categoryBreakdown: { [category: string]: { total: number; count: number } };
  budgetAnalysis?: {
    availableToSpend: number;
    totalSpent: number;
    remaining: number;
    percentageUsed: number;
    isOverBudget: boolean;
    monthlyBudget: {
      income: number;
      fixedExpenses: number;
      savingsGoal: number;
    };
  };
  insights: string[];
  categories: string[];

  // Duplicate transaction detection and prevention
  duplicateInfo?: {
    duplicatesFound: number;
    duplicatesSkipped: number;
    newTransactionsAdded: number;
    totalTransactionsInFile: number;
    duplicateDetails: Array<{
      date: string;
      description: string;
      amount: number;
      existingId: string;
      existingUploadId?: string;
      existingCreatedAt?: string;
      reason: string;
    }>;
  };
}

// AI chat system interfaces
interface ChatResponse {
  message: string;
  tokensUsed: number;
  context?: any;
}

interface ChatHistoryItem {
  message: string;
  type: 'user' | 'assistant';
  timestamp: string;
  tokensUsed?: number;
}

interface QuickQuestionResponse {
  question: string;
  answer: string;
  tokensUsed: number;
}

// Transaction data structure matching database schema
interface Transaction {
  id: string;
  transaction_date: string;
  posted_date?: string;
  card_no?: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  created_at: string;
  updated_at: string;
}

// Monthly financial data for budget tracking
interface MonthlyData {
  month: number;
  year: number;
  income: number;
  fixedExpenses: number;
  savingsGoal: number;
}

// User summary with financial statistics
interface UserSummary {
  user: {
    id: string;
    name: string;
    email: string;
    memberSince: string;
  };
  stats: {
    totalMonths: number;
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    netWorth: number;
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
  };
  recentActivity: {
    lastLogin?: string;
    lastTransaction?: string;
    lastUpload?: string;
  };
}

class ApiService {
  private baseUrl: string;
  private isRefreshing = false; // Prevents multiple simultaneous token refresh attempts
  // Queue for requests waiting on token refresh completion
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('API Service initialized with base URL:', this.baseUrl);
  }

  // Build authentication headers with current access token
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Adding auth header with token:', token?.substring(0, 20) + '...');
    } else {
      console.warn('No auth token found in localStorage');
    }

    return headers;
  }

  // Parse and validate API responses with error handling
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let responseData: any;

    try {
      const responseText = await response.text();
      console.log(`API Response [${response.status}]:`, responseText.substring(0, 200));

      // Handle empty responses gracefully
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Failed to parse response:', error);
      return {
        success: false,
        error: `Failed to parse server response: ${response.status}`,
      };
    }

    // Handle HTTP error responses
    if (!response.ok) {
      console.error(`API Error [${response.status}]:`, responseData);
      return {
        success: false,
        error: responseData.message || responseData.error || `HTTP Error: ${response.status}`,
        code: responseData.code,
      };
    }

    // Return standardized success response
    return {
      success: responseData.success !== false,
      data: responseData.data,
      message: responseData.message,
    };
  }

  // Process queued requests after token refresh completes
  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  // Authentication Methods
  // User login with email and password
  async login(email: string, password: string): Promise<ApiResponse<LoginData>> {
    console.log('Attempting login for:', email);

    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await this.handleResponse<LoginData>(response);

    // Store authentication tokens on successful login
    if (result.success && result.data?.tokens?.accessToken) {
      localStorage.setItem('accessToken', result.data.tokens.accessToken);
      localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
      localStorage.setItem('token', result.data.tokens.accessToken); // Backward compatibility
      console.log('Login successful, tokens stored');
    } else {
      console.error('Login failed:', result.error);
    }

    return result;
  }

  // User registration with email, name, and password
  async register(email: string, name: string, password: string): Promise<ApiResponse<RegisterData>> {
    console.log('Attempting registration for:', email);

    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });

    return this.handleResponse<RegisterData>(response);
  }

  // Add this method to your apiService class
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        error: 'Failed to send reset email'
      };
    }
  }

  // Refresh expired access token using stored refresh token
  async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      console.warn('No refresh token available');
      return {
        success: false,
        error: 'No refresh token available'
      };
    }

    console.log('Refreshing access token...');

    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const result = await this.handleResponse<{ accessToken: string }>(response);

    // Update stored tokens on successful refresh
    if (result.success && result.data?.accessToken) {
      localStorage.setItem('accessToken', result.data.accessToken);
      localStorage.setItem('token', result.data.accessToken); // Backward compatibility
      console.log('Token refreshed successfully');
    } else {
      console.error('Token refresh failed:', result.error);
      this.clearAuth(); // Clear invalid tokens
    }

    return result;
  }

  // Get current user profile information
  async getUserProfile(): Promise<ApiResponse<{ user: any }>> {
    const response = await fetch(`${this.baseUrl}/api/auth/profile`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ user: any }>(response);
  }

  // Update user profile information
  async updateUserProfile(name: string): Promise<ApiResponse<{ user: any }>> {
    const response = await fetch(`${this.baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name }),
    });

    return this.handleResponse<{ user: any }>(response);
  }

  // User logout with token cleanup
  async logout(): Promise<ApiResponse<void>> {
    console.log('Logging out...');

    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    // Clear stored tokens regardless of response status
    this.clearAuth();
    console.log('Logged out and tokens cleared');

    return this.handleResponse<void>(response);
  }

  // Financial Data Management
  // Get current month's financial data (income, expenses, savings)
  async getCurrentMonthData(): Promise<ApiResponse<MonthlyData>> {
    return this.authenticatedRequest<MonthlyData>('/api/financial/current');
  }

  // Update current month's budget data
  async updateCurrentMonthData(data: {
    income: number;
    fixedExpenses: number;
    savingsGoal: number;
  }): Promise<ApiResponse<MonthlyData>> {
    return this.authenticatedRequest<MonthlyData>('/api/financial/current', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get historical financial data for analysis and trends
  async getHistoricalData(year?: number): Promise<ApiResponse<MonthlyData[]>> {
    const endpoint = year
      ? `/api/financial/historical?year=${year}`
      : '/api/financial/historical';

    return this.authenticatedRequest<MonthlyData[]>(endpoint);
  }

  // Get comprehensive financial summary across all data
  async getFinancialSummary(): Promise<ApiResponse<any>> {
    return this.authenticatedRequest<any>('/api/financial/summary');
  }

  // Transaction Management
  // Get transactions with optional filtering and pagination
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ transactions: Transaction[]; pagination: any }>> {
    // Build query string from provided parameters
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/api/transactions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    console.log('Fetching transactions from:', endpoint);

    return this.authenticatedRequest<{ transactions: Transaction[]; pagination: any }>(endpoint);
  }

  // Get single transaction by ID
  async getTransaction(id: string): Promise<ApiResponse<{ transaction: Transaction }>> {
    return this.authenticatedRequest<{ transaction: Transaction }>(`/api/transactions/${id}`);
  }

  // Create new transaction manually
  async createTransaction(transaction: {
    date: string;
    description: string;
    category: string;
    amount: number;
    type: 'income' | 'expense';
  }): Promise<ApiResponse<{ transaction: Transaction }>> {
    return this.authenticatedRequest<{ transaction: Transaction }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  // Update existing transaction
  async updateTransaction(id: string, updates: {
    description?: string;
    category?: string;
    amount?: number;
    type?: 'income' | 'expense';
  }): Promise<ApiResponse<{ transaction: Transaction }>> {
    return this.authenticatedRequest<{ transaction: Transaction }>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Delete transaction by ID
  async deleteTransaction(id: string): Promise<ApiResponse<void>> {
    return this.authenticatedRequest<void>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Get all available transaction categories
  async getTransactionCategories(): Promise<ApiResponse<{ categories: string[] }>> {
    return this.authenticatedRequest<{ categories: string[] }>('/api/transactions/categories');
  }

  // Analytics and Insights
  // Get spending breakdown by category for date range
  async getSpendingByCategory(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    const endpoint = `/api/transactions/analytics/spending-by-category?startDate=${startDate}&endDate=${endDate}`;
    return this.authenticatedRequest<any>(endpoint);
  }

  // Get monthly spending trends for analysis
  async getMonthlyTrends(months?: number): Promise<ApiResponse<{ trends: any[] }>> {
    const endpoint = months
      ? `/api/transactions/analytics/trends?months=${months}`
      : '/api/transactions/analytics/trends';

    return this.authenticatedRequest<{ trends: any[] }>(endpoint);
  }

  // AI Chat System
  // Send message to AI chat system
  async sendChatMessage(message: string): Promise<ApiResponse<ChatResponse>> {
    return this.authenticatedRequest<ChatResponse>('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Get chat conversation history
  async getChatHistory(limit: number = 20): Promise<ApiResponse<{ history: ChatHistoryItem[] }>> {
    return this.authenticatedRequest<{ history: ChatHistoryItem[] }>(`/api/chat/history?limit=${limit}`);
  }

  // Get AI-generated financial insights
  async getChatInsights(): Promise<ApiResponse<{ insights: string[] }>> {
    return this.authenticatedRequest<{ insights: string[] }>('/api/chat/insights');
  }

  // Ask specific financial question to AI
  async askQuickQuestion(question: string): Promise<ApiResponse<QuickQuestionResponse>> {
    return this.authenticatedRequest<QuickQuestionResponse>('/api/chat/quick-question', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  // CSV Upload and Processing
  // Upload and process CSV bank statement file
  async uploadCSV(file: File): Promise<ApiResponse<UploadResponse>> {
    console.log('Uploading CSV file:', file.name, `(${file.size} bytes)`);

    // Create FormData for file upload (not JSON)
    const formData = new FormData();
    formData.append('csvFile', file);

    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

    if (!token) {
      console.error('No auth token for upload');
      return {
        success: false,
        error: 'Authentication required for file upload'
      };
    }

    // File upload requires different headers (no Content-Type for FormData)
    const response = await fetch(`${this.baseUrl}/api/upload/csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Browser sets Content-Type with boundary for FormData
      },
      body: formData,
    });

    return this.handleResponse<UploadResponse>(response);
  }

  // Get history of all CSV uploads
  async getUploadHistory(): Promise<ApiResponse<{ uploads: any[]; pagination: any }>> {
    return this.authenticatedRequest<{ uploads: any[]; pagination: any }>('/api/upload/history');
  }

  // Get transactions from specific upload
  async getUploadTransactions(uploadId: string): Promise<ApiResponse<{ transactions: Transaction[] }>> {
    return this.authenticatedRequest<{ transactions: Transaction[] }>(`/api/upload/${uploadId}/transactions`);
  }

  // Delete uploaded file and associated transactions
  async deleteUpload(uploadId: string): Promise<ApiResponse<void>> {
    return this.authenticatedRequest<void>(`/api/upload/${uploadId}`, {
      method: 'DELETE',
    });
  }

  // User Data and Statistics
  // Get comprehensive user summary with statistics
  async getUserSummary(): Promise<ApiResponse<{ summary: UserSummary }>> {
    return this.authenticatedRequest<{ summary: UserSummary }>('/api/users/summary');
  }

  // Get monthly financial breakdown by year
  async getMonthlyBreakdown(year?: number): Promise<ApiResponse<{ breakdown: any[] }>> {
    const endpoint = year
      ? `/api/users/monthly-breakdown?year=${year}`
      : '/api/users/monthly-breakdown';

    return this.authenticatedRequest<{ breakdown: any[] }>(endpoint);
  }

  // Get budget analysis for specific month/year
  async getBudgetAnalysis(month: number, year: number): Promise<ApiResponse<{ analysis: any }>> {
    return this.authenticatedRequest<{ analysis: any }>(`/api/users/budget-analysis?month=${month}&year=${year}`);
  }

  // Get AI-generated user insights
  async getUserInsights(): Promise<ApiResponse<{ insights: any }>> {
    return this.authenticatedRequest<{ insights: any }>('/api/users/insights');
  }

  // Utility Methods
  // Check if user has valid authentication token
  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return !!token;
  }

  // Get current authentication token
  getToken(): string | null {
    return localStorage.getItem('accessToken') || localStorage.getItem('token');
  }

  // Clear all authentication data from storage
  clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('Auth tokens cleared');
  }

  // Make authenticated request with automatic token refresh on 401 errors
  async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // Wait for ongoing token refresh to complete before proceeding
    if (this.isRefreshing) {
      console.log('Token refresh in progress, queueing request...');
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(() => {
        return this.authenticatedRequest<T>(endpoint, options);
      });
    }

    // Build request with authentication headers
    const requestOptions = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    };

    let response = await fetch(url, requestOptions);

    // Handle 401 Unauthorized with automatic token refresh
    if (response.status === 401 && localStorage.getItem('refreshToken') && !this.isRefreshing) {
      console.log('Access token expired, attempting refresh...');

      this.isRefreshing = true;

      try {
        const refreshResult = await this.refreshToken();

        if (refreshResult.success) {
          // Process queued requests with new token
          this.processQueue(null, refreshResult.data?.accessToken);

          // Retry original request with refreshed token
          const newHeaders = {
            ...requestOptions.headers,
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          };

          response = await fetch(url, {
            ...requestOptions,
            headers: newHeaders
          });
        } else {
          console.error('Token refresh failed, redirecting to login');
          this.processQueue(refreshResult.error, null);
          this.clearAuth();
          // Application should handle redirect to login page
        }
      } catch (error) {
        console.error('Token refresh error:', error);
        this.processQueue(error, null);
        this.clearAuth();
      } finally {
        this.isRefreshing = false;
      }
    }

    return this.handleResponse<T>(response);
  }

  // Check API server health status
  async healthCheck(): Promise<ApiResponse<{ status: string; uptime: number }>> {
    const response = await fetch(`${this.baseUrl}/health`);
    return this.handleResponse<{ status: string; uptime: number }>(response);
  }

  // Test current authentication status
  async testAuth(): Promise<ApiResponse<any>> {
    console.log('Testing authentication...');
    return this.authenticatedRequest<any>('/api/auth/profile');
  }
}

// Export singleton instance and types
export const apiService = new ApiService();
export type {
  ApiResponse,
  LoginData,
  RegisterData,
  UploadResponse,
  ChatResponse,
  ChatHistoryItem,
  QuickQuestionResponse,
  Transaction,
  MonthlyData,
  UserSummary
};