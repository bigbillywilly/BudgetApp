import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

const Login = () => {
  // Form state management for login/register/forgot password toggle
  const [currentMode, setCurrentMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  
  // Input field state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // UI state for loading and messages
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { login, register } = useAuth();

  // Handle form submission for login, registration, and forgot password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (currentMode === 'login') {
        console.log('Attempting login...');
        const result = await login(email, password);
        
        if (!result.success) {
          setError(result.error || 'Login failed');
          console.error('Login failed:', result.error);
        } else {
          console.log('Login successful');
        }
      } else if (currentMode === 'register') {
        console.log('Attempting registration...');
        const result = await register(email, name, password);
        
        if (result.success) {
          setSuccessMessage('Registration successful! Please login with your credentials.');
          setCurrentMode('login');
          setError('');
          setEmail('');
          setPassword('');
          setName('');
          console.log('Registration successful');
        } else {
          setError(result.error || 'Registration failed');
          console.error('Registration failed:', result.error);
        }
      } else if (currentMode === 'forgot') {
        console.log('Attempting forgot password...');
        try {
          const response = await apiService.forgotPassword(email);
          
          if (response.success) {
            setSuccessMessage('Password reset email sent! Please check your email for instructions.');
            setError('');
            console.log('Forgot password email sent successfully');
          } else {
            setError(response.error || 'Failed to send reset email');
            console.error('Forgot password failed:', response.error);
          }
        } catch (err) {
          console.error('Forgot password error:', err);
          setError('Failed to send reset email. Please try again.');
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch between different modes
  const switchMode = (mode: 'login' | 'register' | 'forgot') => {
    setCurrentMode(mode);
    setError('');
    setSuccessMessage('');
    setEmail('');
    setPassword('');
    setName('');
  };

  // Get current form title and description
  const getFormInfo = () => {
    switch (currentMode) {
      case 'login':
        return {
          title: 'Welcome back',
          description: 'Sign in to your account'
        };
      case 'register':
        return {
          title: 'Create account',
          description: 'Sign up to get started'
        };
      case 'forgot':
        return {
          title: 'Reset password',
          description: 'Enter your email to receive reset instructions'
        };
    }
  };

  const formInfo = getFormInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Application header with branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <span className="text-white text-2xl font-bold">E$</span>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            MoneyWise
          </h2>
          <p className="text-gray-600">Smart financial tracking</p>
        </div>

        {/* Main authentication form container */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
          {/* Form header with back button for forgot password */}
          <div className="mb-6">
            {currentMode === 'forgot' ? (
              <div className="flex items-center mb-4">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </button>
              </div>
            ) : (
              /* Mode toggle between login and registration */
              <div className="flex bg-gray-100 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    currentMode === 'login'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  disabled={isLoading}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    currentMode === 'register'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  disabled={isLoading}
                >
                  Register
                </button>
              </div>
            )}

            {/* Form title and description */}
            <div className="text-center mt-4">
              <h3 className="text-xl font-semibold text-gray-900">{formInfo.title}</h3>
              <p className="text-gray-600 text-sm">{formInfo.description}</p>
            </div>
          </div>

          {/* FIXED: Changed from div to form and button type to submit */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email input field with validation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Name field - only shown during registration */}
            {currentMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                  disabled={isLoading}
                  minLength={2}
                  maxLength={50}
                />
              </div>
            )}

            {/* Password input with visibility toggle - hidden for forgot password */}
            {currentMode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Password requirements hint for registration */}
                {currentMode === 'register' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                )}
              </div>
            )}

            {/* Forgot password link - only shown on login */}
            {currentMode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Success message display */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-green-600 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Error message display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* FIXED: Changed button type to submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:hover:scale-100 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {currentMode === 'login' ? 'Login' : 
                   currentMode === 'register' ? 'Register' : 
                   'Send Reset Email'}
                </>
              )}
            </button>
          </form>

          {/* Mode switching helper text */}
          {currentMode !== 'forgot' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                {currentMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => switchMode(currentMode === 'login' ? 'register' : 'login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  {currentMode === 'login' ? 'Register here' : 'Login here'}
                </button>
              </p>
            </div>
          )}

          {/* Additional help text for forgot password */}
          {currentMode === 'forgot' && (
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                We'll send password reset instructions to your email address. 
                Check your spam folder if you don't see it within a few minutes.
              </p>
            </div>
          )}
        </div>

        {/* Development debug information */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-4 bg-gray-800 text-green-400 text-xs rounded-lg font-mono">
            <div>API URL: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}</div>
            <div>Mode: {currentMode}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            {error && <div className="text-red-400">Error: {error}</div>}
            {successMessage && <div className="text-green-400">Success: {successMessage}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;