// Authentication context for managing user authentication state across the application
// Handles login, logout, registration, and token validation with persistent storage
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

// User data structure from authentication API
interface User {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean; // Optional field for email verification status
}

// Authentication context interface defining available methods and state
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

// Create authentication context with undefined initial value for type safety
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component props interface
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component - manages authentication state and provides context to children
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Check existing authentication on component mount
  useEffect(() => {
    console.log('Checking authentication status...');
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (!token) {
      console.log('No access token found');
      setIsLoading(false);
      return;
    }

    console.log('Access token found, validating with server...');
    validateTokenWithServer();
  }, []);

  // Validate stored token with backend API
  const validateTokenWithServer = async () => {
    try {
      const response = await apiService.getUserProfile();
      
      if (response.success && response.data?.user) {
        const userData = response.data.user;
        // Ensure required fields have default values for type safety
        const userWithDefaults: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          emailVerified: userData.emailVerified ?? false,
        };
        setUser(userWithDefaults);
        setIsAuthenticated(true);
        console.log('Token validated, user authenticated:', userWithDefaults.email);
      } else {
        console.log('Token validation failed:', response.error);
        clearAuthData();
      }
    } catch (error) {
      console.error('Token validation error:', error);
      clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all authentication data from localStorage and state
  const clearAuthData = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Authenticate user with email and password
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Attempting login for:', email);
      
      const response = await apiService.login(email, password);

      if (response.success && response.data) {
        const { user: userData, tokens } = response.data;

        // Store authentication tokens in localStorage for persistence
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('token', tokens.accessToken); // Backward compatibility

        // Ensure user data has proper defaults for type safety
        const userWithDefaults: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          emailVerified: userData.emailVerified ?? false,
        };

        // Update authentication state
        setUser(userWithDefaults);
        setIsAuthenticated(true);

        console.log('Login successful:', userWithDefaults.email);
        return { success: true };
      } else {
        console.error('Login failed:', response.error);
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Register new user account with email, name, and password
  const register = async (email: string, name: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Attempting registration for:', email);
      
      const response = await apiService.register(email, name, password);

      if (response.success) {
        console.log('Registration successful:', email);
        return { success: true };
      } else {
        console.error('Registration failed:', response.error);
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Log out current user and clear authentication data
  const logout = (): void => {
    console.log('Logging out user:', user?.email);
    
    // Attempt to notify backend of logout (optional but recommended)
    apiService.logout().catch(error => {
      console.warn('API logout failed:', error);
    });
    
    // Clear local authentication data
    clearAuthData();
    
    console.log('Logout successful');
  };

  // Create context value object with current authentication state and methods
  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing authentication context with error checking
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Export the context itself for advanced use cases
export { AuthContext };

// Default export for Hot Module Replacement compatibility
export default AuthProvider;