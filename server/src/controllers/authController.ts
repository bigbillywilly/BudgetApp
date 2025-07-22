/**
 * authController.ts - Authentication controller for the Budget Application
 * 
 * <description>
 *   This controller handles all authentication-related HTTP requests including user registration,
 *   login, logout, token refresh, password reset, email verification, and profile management.
 *   Provides secure API endpoints with proper error handling and response formatting.
 * </description>
 * 
 * <component name="authController" />
 * <returns>Object - Collection of authentication controller methods</returns>
 */

import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { logInfo, logError } from '../utils/logger';

/* <controller>
     <name>authController</name>
     <purpose>Centralized authentication endpoint handlers</purpose>
     <pattern>Object export with async method collection</pattern>
   </controller> */
export const authController = {
  
  /* <endpoint>
       <method>POST</method>
       <route>/api/auth/register</route>
       <purpose>Register new user account with email verification</purpose>
       <param name="req.body" type="object">Contains email, name, and password</param>
       <returns>201 - User created successfully | 409 - User exists | 500 - Server error</returns>
     </endpoint> */
  async register(req: Request, res: Response) {
    try {
      // <request-validation>
      const { email, name, password } = req.body;
      
      if (!email || !name || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email, name, and password are required'
        });
      }
      // </request-validation>
      
      // <service-call>
      //   <operation>User registration with email verification</operation>
      //   <result>Returns user data and verification status</result>
      // </service-call>
      const result = await authService.register({ email, name, password });
      
      // <success-response>
      //   <status>201 Created</status>
      //   <data>User information without sensitive data</data>
      // </success-response>
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user
        }
      });
    } catch (error: any) {
      logError('Registration controller error', error);
      
      // <error-handling>
      //   <conflict>User already exists with provided email</conflict>
      //   <validation>Invalid input data or format</validation>
      //   <server>Internal server error during registration</server>
      // </error-handling>
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      if (error.message.includes('validation')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  },

  /* <endpoint>
       <method>POST</method>
       <route>/api/auth/login</route>
       <purpose>Authenticate user and provide access/refresh tokens</purpose>
       <param name="req.body" type="object">Contains email and password</param>
       <returns>200 - Login successful | 401 - Invalid credentials | 500 - Server error</returns>
     </endpoint> */
  async login(req: Request, res: Response) {
    try {
      // <request-validation>
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      // </request-validation>
      
      // <service-call>
      //   <operation>User authentication with credential verification</operation>
      //   <result>Returns user data and JWT token pair</result>
      // </service-call>
      const result = await authService.login(email, password);
      
      // <success-response>
      //   <status>200 OK</status>
      //   <data>User information and authentication tokens</data>
      // </success-response>
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error: any) {
      logError('Login controller error', error);
      
      // <error-handling>
      //   <unauthorized>Invalid email or password provided</unauthorized>
      //   <server>Internal server error during authentication</server>
      // </error-handling>
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  },

  /* <endpoint>
       <method>POST</method>
       <route>/api/auth/refresh</route>
       <purpose>Generate new access token using valid refresh token</purpose>
       <param name="req.body" type="object">Contains refresh token</param>
       <returns>200 - Token refreshed | 400 - Missing token | 401 - Invalid token</returns>
     </endpoint> */
  async refreshToken(req: Request, res: Response) {
    try {
      // <request-validation>
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }
      // </request-validation>
      
      // <service-call>
      //   <operation>Token refresh with validation and new token generation</operation>
      //   <result>Returns new access token for continued authentication</result>
      // </service-call>
      const result = await authService.refreshToken(refreshToken);
      
      // <success-response>
      //   <status>200 OK</status>
      //   <data>New access token for API authentication</data>
      // </success-response>
      res.json({
        success: true,
        data: {
          accessToken: result.accessToken
        }
      });
    } catch (error: any) {
      logError('Token refresh controller error', error);
      
      // <error-handling>
      //   <unauthorized>Invalid or expired refresh token</unauthorized>
      // </error-handling>
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  },

  /* <endpoint>
       <method>POST</method>
       <route>/api/auth/verify-email</route>
       <purpose>Verify user email address using verification token</purpose>
       <param name="req.body" type="object">Contains verification token</param>
       <returns>200 - Email verified | 400 - Invalid token | 500 - Server error</returns>
     </endpoint> */
  async verifyEmail(req: Request, res: Response) {
    try {
      // <request-validation>
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }
      // </request-validation>
      
      // <service-call>
      //   <operation>Email verification with token validation</operation>
      //   <result>Activates user account and confirms email ownership</result>
      // </service-call>
      await authService.verifyEmail(token);
      
      // <success-response>
      //   <status>200 OK</status>
      //   <message>Email verification completed successfully</message>
      // </success-response>
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error: any) {
      logError('Email verification controller error', error);
      
      // <error-handling>
      //   <bad-request>Invalid or expired verification token</bad-request>
      //   <server>Internal server error during verification</server>
      // </error-handling>
      if (error.message === 'Invalid verification token') {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  },

  /* <endpoint>
       <method>POST</method>
       <route>/api/auth/forgot-password</route>
       <purpose>Initiate password reset process by sending reset email</purpose>
       <param name="req.body" type="object">Contains user email address</param>
       <returns>200 - Reset initiated | 400 - Invalid email | 500 - Server error</returns>
     </endpoint> */
  async forgotPassword(req: Request, res: Response) {
    try {
      // <request-validation>
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }
      // </request-validation>
      
      // <service-call>
      //   <operation>Password reset request with email notification</operation>
      //   <security>Always returns success to prevent email enumeration</security>
      // </service-call>
      await authService.requestPasswordReset(email);
      
      // <success-response>
      //   <status>200 OK</status>
      //   <security>Generic message prevents email enumeration attacks</security>
      // </success-response>
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (error: any) {
      logError('Forgot password controller error', error);
      
      // <error-handling>
      //   <server>Internal server error during password reset request</server>
      // </error-handling>
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  },

  /* <endpoint>
       <method>POST</method>
       <route>/api/auth/reset-password</route>
       <purpose>Complete password reset using reset token and new password</purpose>
       <param name="req.body" type="object">Contains reset token and new password</param>
       <returns>200 - Password reset | 400 - Invalid token | 500 - Server error</returns>
     </endpoint> */
  async resetPassword(req: Request, res: Response) {
    try {
      // <request-validation>
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Reset token and new password are required'
        });
      }
      // </request-validation>
      
      // <service-call>
      //   <operation>Password reset completion with token validation</operation>
      //   <result>Updates user password and invalidates reset token</result>
      // </service-call>
      await authService.resetPassword(token, password);
      
      // <success-response>
      //   <status>200 OK</status>
      //   <message>Password successfully updated</message>
      // </success-response>
      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error: any) {
      logError('Reset password controller error', error);
      
      // <error-handling>
      //   <bad-request>Invalid or expired reset token</bad-request>
      //   <server>Internal server error during password reset</server>
      // </error-handling>
      if (error.message === 'Invalid or expired reset token') {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Password reset failed'
      });
    }
  },

  /* <endpoint>
       <method>GET</method>
       <route>/api/auth/profile</route>
       <purpose>Retrieve authenticated user's profile information</purpose>
       <middleware>Requires valid authentication token</middleware>
       <returns>200 - Profile data | 401 - Authentication required | 500 - Server error</returns>
     </endpoint> */
  async getProfile(req: Request, res: Response) {
    try {
      // <authentication-check>
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      // </authentication-check>

      // <service-call>
      //   <operation>User profile retrieval with data sanitization</operation>
      //   <result>Returns user profile without sensitive information</result>
      // </service-call>
      const user = await authService.getUserProfile(req.user.userId);
      
      // <success-response>
      //   <status>200 OK</status>
      //   <data>User profile information</data>
      // </success-response>
      res.json({
        success: true,
        data: { user }
      });
    } catch (error: any) {
      logError('Get profile controller error', error);
      
      // <error-handling>
      //   <server>Internal server error during profile retrieval</server>
      // </error-handling>
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  },

  /* <endpoint>
       <method>PUT</method>
       <route>/api/auth/profile</route>
       <purpose>Update authenticated user's profile information</purpose>
       <middleware>Requires valid authentication token</middleware>
       <param name="req.body" type="object">Contains profile update data</param>
       <returns>200 - Profile updated | 401 - Authentication required | 500 - Server error</returns>
     </endpoint> */
  async updateProfile(req: Request, res: Response) {
    try {
      // <authentication-check>
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      // </authentication-check>

      // <request-validation>
      const { name } = req.body;
      
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for profile update'
        });
      }
      // </request-validation>
      
      // <service-call>
      //   <operation>User profile update with data validation</operation>
      //   <result>Returns updated user profile information</result>
      // </service-call>
      const user = await authService.updateUserProfile(req.user.userId, { name });
      
      // <success-response>
      //   <status>200 OK</status>
      //   <data>Updated user profile information</data>
      // </success-response>
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error: any) {
      logError('Update profile controller error', error);
      
      // <error-handling>
      //   <server>Internal server error during profile update</server>
      // </error-handling>
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  },

  /* <endpoint>
       <method>POST</method>
       <route>/api/auth/logout</route>
       <purpose>Logout user and invalidate authentication session</purpose>
       <middleware>Requires valid authentication token</middleware>
       <returns>200 - Logout successful | 500 - Server error</returns>
       <note>In production, this should invalidate refresh tokens</note>
     </endpoint> */
  async logout(req: Request, res: Response) {
    try {
      // <logout-process>
      //   <current>Simple success response for client-side token removal</current>
      //   <future>Should implement server-side token blacklisting for enhanced security</future>
      // </logout-process>
      
      // <success-response>
      //   <status>200 OK</status>
      //   <message>Logout completed successfully</message>
      // </success-response>
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      logError('Logout controller error', error);
      
      // <error-handling>
      //   <server>Internal server error during logout process</server>
      // </error-handling>
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
};