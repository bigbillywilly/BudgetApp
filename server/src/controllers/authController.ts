// server/src/controllers/authController.ts - UPDATED VERSION
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { jwtService } from '../utils/jwt';
import { encryptionService } from '../utils/encryption';
import { logInfo, logError, logWarn } from '../utils/logger';

// User authentication response interfaces
export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: string;
  };
  message: string;
}

// Authentication controller with user management endpoints
export const authController = {
  // Register new user with validation and transaction safety
  async register(req: Request, res: Response) {
    const pool = db.getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { email, name, password } = req.body;
      
      logInfo('Registration attempt', { email, name });

      // Input validation
      if (!email || !name || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email, name, and password are required'
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Password strength validation
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check for existing user
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password and generate verification token
      const passwordHash = await encryptionService.hashPassword(password);
      const emailVerificationToken = jwtService.generateEmailVerificationToken();

      // Create user with generated UUID
      const userId = uuidv4();
      const result = await client.query(`
        INSERT INTO users (id, email, name, password_hash, email_verification_token, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, email_verified, created_at
      `, [userId, email.toLowerCase(), name.trim(), passwordHash, emailVerificationToken, false]);

      await client.query('COMMIT');

      const user = result.rows[0];
      
      logInfo('User registered successfully', { userId: user.id, email: user.email });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.email_verified,
            createdAt: user.created_at
          }
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logError('User registration failed', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    } finally {
      client.release();
    }
  },

  // Authenticate user with email and password
  async login(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      const { email, password } = req.body;
      
      logInfo('Login attempt', { email });

      // Input validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Fetch user by email
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        logWarn('Invalid login attempt - user not found', { email });
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const user = result.rows[0];

      // Verify password hash
      const isPasswordValid = await encryptionService.comparePassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        logWarn('Invalid login attempt - wrong password', { email, userId: user.id });
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update last login timestamp
      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate JWT token pair
      const tokens = jwtService.generateTokenPair({
        userId: user.id,
        email: user.email
      });

      logInfo('User logged in successfully', { userId: user.id, email: user.email });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.email_verified,
            createdAt: user.created_at
          },
          tokens
        }
      });
    } catch (error) {
      logError('User login failed', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  },

  // Generate new access token using valid refresh token
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify and decode refresh token
      const decoded = jwtService.verifyRefreshToken(refreshToken);
      
      // Validate user still exists
      const pool = db.getPool();
      const result = await pool.query(
        'SELECT id, email FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = result.rows[0];

      // Generate new access token
      const accessToken = jwtService.generateAccessToken({
        userId: user.id,
        email: user.email
      });

      res.json({
        success: true,
        data: { accessToken }
      });
    } catch (error) {
      logError('Token refresh failed', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  },

  // Verify user email address with token
  async verifyEmail(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }

      // Update user as verified and clear token
      const result = await pool.query(
        'UPDATE users SET email_verified = true, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id, email',
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token'
        });
      }

      const user = result.rows[0];
      logInfo('Email verified successfully', { userId: user.id, email: user.email });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      logError('Email verification failed', error);
      res.status(500).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  },

  // Generate password reset token for email
  async forgotPassword(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      // Generate reset token with 1-hour expiry
      const token = jwtService.generatePasswordResetToken();
      const expires = new Date(Date.now() + 3600000);

      const result = await pool.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3 RETURNING id',
        [token, expires, email.toLowerCase()]
      );

      // Always return success to prevent email enumeration attacks
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });

      if (result.rows.length > 0) {
        logInfo('Password reset requested', { email, userId: result.rows[0].id });
        // TODO: Send email with reset token
      } else {
        logWarn('Password reset requested for non-existent email', { email });
      }
    } catch (error) {
      logError('Password reset request failed', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  },

  // Reset password using valid reset token
  async resetPassword(req: Request, res: Response) {
    const pool = db.getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Reset token and new password are required'
        });
      }

      // Validate token and check expiry
      const result = await client.query(
        'SELECT id, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
        [token]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      const user = result.rows[0];

      // Hash new password and clear reset tokens
      const passwordHash = await encryptionService.hashPassword(password);

      await client.query(
        'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
        [passwordHash, user.id]
      );

      await client.query('COMMIT');

      logInfo('Password reset successfully', { userId: user.id, email: user.email });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Password reset failed', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed'
      });
    } finally {
      client.release();
    }
  },

  // Get authenticated user profile data
  async getProfile(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;

      const result = await pool.query(
        'SELECT id, email, name, email_verified, last_login, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = result.rows[0];

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.email_verified,
            lastLogin: user.last_login,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }
        }
      });
    } catch (error) {
      logError('Failed to get user profile', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  },

  // Update authenticated user profile information
  async updateProfile(req: Request, res: Response) {
    const pool = db.getPool();
    
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId;
      const { name } = req.body;
      
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name is required'
        });
      }

      // Update user name with timestamp
      const result = await pool.query(`
        UPDATE users 
        SET name = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
        RETURNING id, email, name, email_verified, last_login, created_at, updated_at
      `, [name.trim(), userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = result.rows[0];
      logInfo('User profile updated', { userId });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.email_verified,
            lastLogin: user.last_login,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }
        }
      });
    } catch (error) {
      logError('Failed to update user profile', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  },

  // Logout user (client-side token invalidation)
  async logout(req: Request, res: Response) {
    try {
      // Note: Token blacklisting would be implemented here in production
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logError('Logout failed', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
};