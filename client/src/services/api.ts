// client/src/services/api.ts - VITE COMPATIBLE VERSION
import { ApiResponse } from '../types/api.types';
import { User, LoginCredentials, RegisterData } from '../types/auth.types';
import { Transaction, MonthlyData } from '../types/financial.types';

// Vite uses import.meta.env instead of process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log('🌐 API Service initialized with base URL:', this.baseUrl);
  }

  // Helper method to get auth headers
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Generic request method with error handling
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config: RequestInit = {
        headers: this.getAuthHeaders(),
        ...options
      };

      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
          console.log('🔄 Token expired, attempting refresh...');
          try {
            await this.refreshToken();
            // Retry the original request
            const retryConfig = {
              ...config,
              headers: this.getAuthHeaders()
            };
            const retryResponse = await fetch(url, retryConfig);
            const retryData = await retryResponse.json();
            console.log('✅ Retry successful after token refresh');
            return retryData;
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            // Clear tokens and redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.reload();
          }
        }

        console.error(`❌ API Error ${response.status}:`, data);
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      console.log('✅ API Response:', data);
      return data;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===========================================
  // AUTHENTICATION METHODS
  // ===========================================

  async register(userData: RegisterData): Promise<ApiResponse<{ user: User }>> {
    console.log('📝 Registering user:', userData.email);
    return this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: any }>> {
    console.log('🔐 Logging in user:', credentials.email);
    
    const response = await this.request<{ user: User; tokens: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    // Store tokens if login successful
    if (response.success && response.data?.tokens) {
      console.log('✅ Login successful, storing tokens');
      localStorage.setItem('accessToken', response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
    }

    return response;
  }

  async logout(): Promise<ApiResponse> {
    console.log('🚪 Logging out user');
    
    const response = await this.request('/auth/logout', { method: 'POST' });
    
    // Clear stored tokens regardless of response
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('✅ Tokens cleared');
    
    return response;
  }

  async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('🔄 Refreshing access token');

    const response = await this.request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });

    if (response.success && response.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      console.log('✅ Access token refreshed');
    }

    return response;
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    console.log('👤 Fetching user profile');
    return this.request<{ user: User }>('/auth/profile');
  }

  // ===========================================
  // FINANCIAL DATA METHODS
  // ===========================================

  async getCurrentMonthData(): Promise<ApiResponse<MonthlyData>> {
    console.log('📊 Fetching current month data');
    return this.request<MonthlyData>('/financial/current');
  }

  async updateCurrentMonthData(data: {
    income: number;
    fixedExpenses: number;
    savingsGoal: number;
  }): Promise<ApiResponse<MonthlyData>> {
    console.log('💾 Updating current month data:', data);
    return this.request<MonthlyData>('/financial/current', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getHistoricalData(): Promise<ApiResponse<any[]>> {
    console.log('📈 Fetching historical financial data');
    return this.request<any[]>('/financial/historical');
  }

  // ===========================================
  // TRANSACTION METHODS
  // ===========================================

  async getTransactions(params?: {
    page?: number;
    limit?: number;
    category?: string;
    type?: 'income' | 'expense';
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

    const endpoint = `/transactions${queryParams.toString() ? `?${queryParams}` : ''}`;
    console.log('💰 Fetching transactions with params:', params);
    return this.request<{ transactions: Transaction[]; pagination: any }>(endpoint);
  }

  async createTransaction(transaction: {
    date: string;
    description: string;
    category: string;
    amount: number;
    type: 'income' | 'expense';
  }): Promise<ApiResponse<{ transaction: Transaction }>> {
    console.log('➕ Creating new transaction:', transaction);
    return this.request<{ transaction: Transaction }>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction)
    });
  }

  async updateTransaction(id: string, updates: any): Promise<ApiResponse<{ transaction: Transaction }>> {
    console.log('✏️ Updating transaction:', id, updates);
    return this.request<{ transaction: Transaction }>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteTransaction(id: string): Promise<ApiResponse> {
    console.log('🗑️ Deleting transaction:', id);
    return this.request(`/transactions/${id}`, { method: 'DELETE' });
  }

  async getCategories(): Promise<ApiResponse<{ categories: any[] }>> {
    console.log('📋 Fetching transaction categories');
    return this.request<{ categories: any[] }>('/transactions/categories');
  }

  // ===========================================
  // FILE UPLOAD METHODS
  // ===========================================

  async uploadCSV(file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('csvFile', file);

    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      console.log('📤 Uploading CSV file:', file.name, 'Size:', file.size, 'bytes');
      
      const response = await fetch(`${this.baseUrl}/upload/csv`, {
        method: 'POST',
        headers,
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ CSV upload successful:', result);
      } else {
        console.error('❌ CSV upload failed:', result);
      }

      return result;
    } catch (error) {
      console.error('❌ Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async getUploadHistory(): Promise<ApiResponse<{ uploads: any[] }>> {
    console.log('📋 Fetching upload history');
    return this.request<{ uploads: any[] }>('/upload/history');
  }

  // ===========================================
  // CHAT METHODS
  // ===========================================

  async sendChatMessage(message: string): Promise<ApiResponse<{
    message: string;
    tokensUsed: number;
    context: any;
  }>> {
    console.log('💬 Sending chat message:', message.substring(0, 50) + '...');
    return this.request<{
      message: string;
      tokensUsed: number;
      context: any;
    }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  async getChatHistory(limit = 20): Promise<ApiResponse<{ history: any[] }>> {
    console.log('📜 Fetching chat history, limit:', limit);
    return this.request<{ history: any[] }>(`/chat/history?limit=${limit}`);
  }

  async getInsights(): Promise<ApiResponse<{ insights: string[] }>> {
    console.log('💡 Fetching AI insights');
    return this.request<{ insights: string[] }>('/chat/insights');
  }

  // ===========================================
  // USER ANALYTICS METHODS
  // ===========================================

  async getUserSummary(): Promise<ApiResponse<{ summary: any }>> {
    console.log('📊 Fetching user summary');
    return this.request<{ summary: any }>('/users/summary');
  }

  async getMonthlyBreakdown(year?: number): Promise<ApiResponse<{ breakdown: any[] }>> {
    const endpoint = year ? `/users/monthly-breakdown?year=${year}` : '/users/monthly-breakdown';
    console.log('📈 Fetching monthly breakdown for year:', year || 'current');
    return this.request<{ breakdown: any[] }>(endpoint);
  }

  async getBudgetAnalysis(month: number, year: number): Promise<ApiResponse<{ analysis: any }>> {
    console.log('🎯 Fetching budget analysis for:', `${month}/${year}`);
    return this.request<{ analysis: any }>(`/users/budget-analysis?month=${month}&year=${year}`);
  }

  // ===========================================
  // HEALTH CHECK
  // ===========================================

  async healthCheck(): Promise<ApiResponse<any>> {
    console.log('🏥 Performing health check');
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: 'Health check failed'
      };
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  // Get stored user token
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Clear all stored tokens
  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('🧹 All tokens cleared');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;