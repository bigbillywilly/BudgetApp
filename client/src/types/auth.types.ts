/**
 * Authentication Type Definitions
 * 
 * Type definitions for user authentication, authorization, and session management
 * used throughout the MoneyWise application authentication system.
 */

// User profile data structure from backend authentication system
export interface User {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

// Login form data structure for authentication requests
export interface LoginCredentials {
  email: string;
  password: string;
}

// Registration form data structure for new user creation
export interface RegisterData {
  email: string;
  name: string;
  password: string;
}

// JWT token pair for authentication and session management
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
