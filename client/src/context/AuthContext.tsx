// client/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/auth.types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('🔐 Checking authentication status...');
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('❌ No access token found');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiService.getProfile();
      if (response.success && response.data?.user) {
        console.log('✅ User authenticated:', response.data.user.email);
        setUser(response.data.user);
      } else {
        console.log('❌ Profile fetch failed:', response.error);
        // Clear invalid tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('🔐 Attempting login for:', email);
    
    try {
      const response = await apiService.login({ email, password });
      
      if (response.success && response.data?.user) {
        console.log('✅ Login successful:', response.data.user.email);
        setUser(response.data.user);
        return { success: true };
      } else {
        console.log('❌ Login failed:', response.error);
        return { 
          success: false, 
          error: response.error || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  };

  const register = async (email: string, name: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('📝 Attempting registration for:', email);
    
    try {
      const response = await apiService.register({ email, name, password });
      
      if (response.success) {
        console.log('✅ Registration successful');
        return { success: true };
      } else {
        console.log('❌ Registration failed:', response.error);
        return { 
          success: false, 
          error: response.error || 'Registration failed' 
        };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    console.log('🚪 Logging out...');
    
    try {
      await apiService.logout();
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setUser(null);
      console.log('✅ User logged out');
    }
  };

  const refreshUser = async () => {
    console.log('🔄 Refreshing user data...');
    
    try {
      const response = await apiService.getProfile();
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        console.log('✅ User data refreshed');
      }
    } catch (error) {
      console.error('❌ User refresh failed:', error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};