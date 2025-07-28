/**
 * api.ts - Frontend API service for Budget Application
 * 
 * <description>
 *   This service provides a centralized interface for all HTTP requests to the backend API.
 *   Handles authentication, request/response formatting, error handling, and token management.
 *   Works with the MoneyWise backend API structure.
 * </description>
 */

// <interfaces>
//   <api-response>Standard API response structure matching backend format</api-response>
//   <data-types>Specific type definitions for different API responses</data-types>
// </interfaces>

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string; // For specific error codes like TOKEN_EXPIRED
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

// Data types
interface UploadResponse {
  uploadId: string;
  filename: string;
  size: number;
  uploadDate: string;
  processedTransactions?: number;
}

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

interface MonthlyData {
  month: number;
  year: number;
  income: number;
  fixedExpenses: number;
  savingsGoal: number;
}

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
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('🔧 API Service initialized with base URL:', this.baseUrl);
  }

  // Enhanced auth headers with better debugging
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Adding auth header with token:', token?.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ No auth token found in localStorage');
    }
    
    return headers;
  }

  // Improved response handling with better error parsing
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let responseData: any;
    
    try {
      const responseText = await response.text();
      console.log(`📡 API Response [${response.status}]:`, responseText.substring(0, 200));
      
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('❌ Failed to parse response:', error);
      return {
        success: false,
        error: `Failed to parse server response: ${response.status}`,
      };
    }
    
    if (!response.ok) {
      console.error(`❌ API Error [${response.status}]:`, responseData);
      return {
        success: false,
        error: responseData.message || responseData.error || `HTTP Error: ${response.status}`,
        code: responseData.code,
      };
    }

    // Backend sends: { success: true, data: {...}, message: "..." }
    return {
      success: responseData.success !== false,
      data: responseData.data,
      message: responseData.message,
    };
  }

  // Process refresh token queue
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

  // =============================================================================
  // AUTHENTICATION - IMPROVED WITH BETTER TOKEN MANAGEMENT
  // =============================================================================

  async login(email: string, password: string): Promise<ApiResponse<LoginData>> {
    console.log('🔐 Attempting login for:', email);
    
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await this.handleResponse<LoginData>(response);
    
    // Store tokens on successful login with consistent naming
    if (result.success && result.data?.tokens?.accessToken) {
      localStorage.setItem('accessToken', result.data.tokens.accessToken);
      localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
      // Keep legacy token for backward compatibility
      localStorage.setItem('token', result.data.tokens.accessToken);
      console.log('✅ Login successful, tokens stored');
    } else {
      console.error('❌ Login failed:', result.error);
    }
    
    return result;
  }

  async register(email: string, name: string, password: string): Promise<ApiResponse<RegisterData>> {
    console.log('📝 Attempting registration for:', email);
    
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });

    return this.handleResponse<RegisterData>(response);
  }

  async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.warn('⚠️ No refresh token available');
      return {
        success: false,
        error: 'No refresh token available'
      };
    }

    console.log('🔄 Refreshing access token...');

    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const result = await this.handleResponse<{ accessToken: string }>(response);
    
    // Update stored token on successful refresh
    if (result.success && result.data?.accessToken) {
      localStorage.setItem('accessToken', result.data.accessToken);
      localStorage.setItem('token', result.data.accessToken); // Backward compatibility
      console.log('✅ Token refreshed successfully');
    } else {
      console.error('❌ Token refresh failed:', result.error);
      this.clearAuth(); // Clear invalid tokens
    }
    
    return result;
  }

  async getUserProfile(): Promise<ApiResponse<{ user: any }>> {
    const response = await fetch(`${this.baseUrl}/api/auth/profile`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ user: any }>(response);
  }

  async updateUserProfile(name: string): Promise<ApiResponse<{ user: any }>> {
    const response = await fetch(`${this.baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name }),
    });

    return this.handleResponse<{ user: any }>(response);
  }

  async logout(): Promise<ApiResponse<void>> {
    console.log('👋 Logging out...');
    
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    // Clear stored tokens regardless of response
    this.clearAuth();
    console.log('✅ Logged out and tokens cleared');

    return this.handleResponse<void>(response);
  }

  // =============================================================================
  // FINANCIAL DATA - UPDATED FOR BACKEND ENDPOINTS
  // =============================================================================

  async getCurrentMonthData(): Promise<ApiResponse<MonthlyData>> {
    return this.authenticatedRequest<MonthlyData>('/api/financial/current');
  }

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

  async getHistoricalData(year?: number): Promise<ApiResponse<MonthlyData[]>> {
    const endpoint = year 
      ? `/api/financial/historical?year=${year}`
      : '/api/financial/historical';

    return this.authenticatedRequest<MonthlyData[]>(endpoint);
  }

  async getFinancialSummary(): Promise<ApiResponse<any>> {
    return this.authenticatedRequest<any>('/api/financial/summary');
  }

  // =============================================================================
  // TRANSACTIONS - MATCH BACKEND ROUTES
  // =============================================================================

  async getTransactions(params?: {
    page?: number;
    limit?: number;
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ transactions: Transaction[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/api/transactions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    console.log('📊 Fetching transactions from:', endpoint);
    
    return this.authenticatedRequest<{ transactions: Transaction[]; pagination: any }>(endpoint);
  }

  async getTransaction(id: string): Promise<ApiResponse<{ transaction: Transaction }>> {
    return this.authenticatedRequest<{ transaction: Transaction }>(`/api/transactions/${id}`);
  }

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

  async deleteTransaction(id: string): Promise<ApiResponse<void>> {
    return this.authenticatedRequest<void>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  async getTransactionCategories(): Promise<ApiResponse<{ categories: string[] }>> {
    return this.authenticatedRequest<{ categories: string[] }>('/api/transactions/categories');
  }

  // =============================================================================
  // ANALYTICS - MATCH BACKEND ANALYTICS ROUTES
  // =============================================================================

  async getSpendingByCategory(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    const endpoint = `/api/transactions/analytics/spending-by-category?startDate=${startDate}&endDate=${endDate}`;
    return this.authenticatedRequest<any>(endpoint);
  }

  async getMonthlyTrends(months?: number): Promise<ApiResponse<{ trends: any[] }>> {
    const endpoint = months 
      ? `/api/transactions/analytics/trends?months=${months}`
      : '/api/transactions/analytics/trends';

    return this.authenticatedRequest<{ trends: any[] }>(endpoint);
  }

  // =============================================================================
  // CHAT/AI - MATCH BACKEND CHAT ROUTES
  // =============================================================================

  async sendChatMessage(message: string): Promise<ApiResponse<ChatResponse>> {
    return this.authenticatedRequest<ChatResponse>('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getChatHistory(limit: number = 20): Promise<ApiResponse<{ history: ChatHistoryItem[] }>> {
    return this.authenticatedRequest<{ history: ChatHistoryItem[] }>(`/api/chat/history?limit=${limit}`);
  }

  async getChatInsights(): Promise<ApiResponse<{ insights: string[] }>> {
    return this.authenticatedRequest<{ insights: string[] }>('/api/chat/insights');
  }

  async askQuickQuestion(question: string): Promise<ApiResponse<QuickQuestionResponse>> {
    return this.authenticatedRequest<QuickQuestionResponse>('/api/chat/quick-question', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  // =============================================================================
  // CSV UPLOAD - MATCH BACKEND UPLOAD ROUTES WITH PROPER AUTH
  // =============================================================================

  async uploadCSV(file: File): Promise<ApiResponse<UploadResponse>> {
    console.log('📄 Uploading CSV file:', file.name, `(${file.size} bytes)`);
    
    const formData = new FormData();
    formData.append('csvFile', file);

    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ No auth token for upload');
      return {
        success: false,
        error: 'Authentication required for file upload'
      };
    }

    const response = await fetch(`${this.baseUrl}/api/upload/csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    });

    return this.handleResponse<UploadResponse>(response);
  }

  async getUploadHistory(): Promise<ApiResponse<{ uploads: any[]; pagination: any }>> {
    return this.authenticatedRequest<{ uploads: any[]; pagination: any }>('/api/upload/history');
  }

  async getUploadTransactions(uploadId: string): Promise<ApiResponse<{ transactions: Transaction[] }>> {
    return this.authenticatedRequest<{ transactions: Transaction[] }>(`/api/upload/${uploadId}/transactions`);
  }

  async deleteUpload(uploadId: string): Promise<ApiResponse<void>> {
    return this.authenticatedRequest<void>(`/api/upload/${uploadId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // USER DATA - MATCH BACKEND USER ROUTES
  // =============================================================================

  async getUserSummary(): Promise<ApiResponse<{ summary: UserSummary }>> {
    return this.authenticatedRequest<{ summary: UserSummary }>('/api/users/summary');
  }

  async getMonthlyBreakdown(year?: number): Promise<ApiResponse<{ breakdown: any[] }>> {
    const endpoint = year 
      ? `/api/users/monthly-breakdown?year=${year}`
      : '/api/users/monthly-breakdown';

    return this.authenticatedRequest<{ breakdown: any[] }>(endpoint);
  }

  async getBudgetAnalysis(month: number, year: number): Promise<ApiResponse<{ analysis: any }>> {
    return this.authenticatedRequest<{ analysis: any }>(`/api/users/budget-analysis?month=${month}&year=${year}`);
  }

  async getUserInsights(): Promise<ApiResponse<{ insights: any }>> {
    return this.authenticatedRequest<{ insights: any }>('/api/users/insights');
  }

  // =============================================================================
  // UTILITY METHODS - ENHANCED
  // =============================================================================

  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken') || localStorage.getItem('token');
  }

  clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('🧹 Auth tokens cleared');
  }

  // Enhanced authenticated request with automatic token refresh
  async authenticatedRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // If token refresh is in progress, wait for it
    if (this.isRefreshing) {
      console.log('⏳ Token refresh in progress, queueing request...');
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(() => {
        return this.authenticatedRequest<T>(endpoint, options);
      });
    }

    const requestOptions = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    };

    let response = await fetch(url, requestOptions);

    // Handle 401 errors with automatic token refresh
    if (response.status === 401 && localStorage.getItem('refreshToken') && !this.isRefreshing) {
      console.log('🔄 Access token expired, attempting refresh...');
      
      this.isRefreshing = true;
      
      try {
        const refreshResult = await this.refreshToken();
        
        if (refreshResult.success) {
          this.processQueue(null, refreshResult.data?.accessToken);
          
          // Retry the original request with new token
          const newHeaders = {
            ...requestOptions.headers,
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          };
          
          response = await fetch(url, {
            ...requestOptions,
            headers: newHeaders
          });
        } else {
          console.error('❌ Token refresh failed, redirecting to login');
          this.processQueue(refreshResult.error, null);
          this.clearAuth();
          // You might want to redirect to login here
          // window.location.href = '/login';
        }
      } catch (error) {
        console.error('❌ Token refresh error:', error);
        this.processQueue(error, null);
        this.clearAuth();
      } finally {
        this.isRefreshing = false;
      }
    }

    return this.handleResponse<T>(response);
  }

  // Health check endpoint
  async healthCheck(): Promise<ApiResponse<{ status: string; uptime: number }>> {
    const response = await fetch(`${this.baseUrl}/health`);
    return this.handleResponse<{ status: string; uptime: number }>(response);
  }

  // Test authentication
  async testAuth(): Promise<ApiResponse<any>> {
    console.log('🧪 Testing authentication...');
    return this.authenticatedRequest<any>('/api/auth/profile');
  }
}

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