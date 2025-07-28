// client/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../../services/api';

// Types - FIXED to match API response
interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean; // Changed from optional to required boolean
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

// Create context with proper typing
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to normalize user data
const normalizeUserData = (userData: any): User => {
  return {
    id: userData.id,
    email: userData.email,
    name: userData.name,
    emailVerified: Boolean(userData.emailVerified), // Convert to boolean, defaults to false
  };
};

// AuthProvider component - MUST be default export for HMR
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    console.log('🔐 Checking authentication status...');
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (!token) {
      console.log('❌ No access token found');
      setIsLoading(false);
      return;
    }

    console.log('✅ Access token found, validating with server...');
    
    // Validate token with server
    validateTokenWithServer();
  }, []);

  // Validate token with server
  const validateTokenWithServer = async () => {
    try {
      const response = await apiService.getUserProfile();
      
      if (response.success && response.data?.user) {
        const userData = response.data.user;
        
        // FIXED: Use normalizeUserData to ensure proper typing
        const normalizedUser = normalizeUserData(userData);
        setUser(normalizedUser);
        setIsAuthenticated(true);
        console.log('✅ Token validated, user authenticated:', normalizedUser.email);
      } else {
        console.log('❌ Token validation failed:', response.error);
        clearAuthData();
      }
    } catch (error) {
      console.error('❌ Token validation error:', error);
      clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  // Clear authentication data
  const clearAuthData = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Login function - FIXED with proper data normalization
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Attempting login for:', email);
      
      const response = await apiService.login(email, password);

      if (response.success && response.data) {
        const { user: userData, tokens } = response.data;

        // Store tokens
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('token', tokens.accessToken); // Backward compatibility

        // FIXED: Use normalizeUserData to ensure proper typing
        const normalizedUser = normalizeUserData(userData);
        setUser(normalizedUser);
        setIsAuthenticated(true);

        console.log('✅ Login successful:', normalizedUser.email);
        return { success: true };
      } else {
        console.error('❌ Login failed:', response.error);
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Register function - FIXED return type
  const register = async (email: string, name: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('📝 Attempting registration for:', email);
      
      const response = await apiService.register(email, name, password);

      if (response.success) {
        console.log('✅ Registration successful:', email);
        return { success: true };
      } else {
        console.error('❌ Registration failed:', response.error);
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Logout function
  const logout = (): void => {
    console.log('🚪 Logging out user:', user?.email);
    
    // Call API logout (optional, but good practice)
    apiService.logout().catch((error: unknown) => {
      console.warn('⚠️ API logout failed:', error);
    });
    
    // Clear local data
    clearAuthData();
    
    console.log('✅ Logout successful');
  };

  // Context value
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

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Export the context itself (optional, for advanced use cases)
export { AuthContext };

// IMPORTANT: Default export for HMR compatibility
export default AuthProvider;