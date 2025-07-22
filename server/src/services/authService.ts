// server/src/services/authService.ts
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { jwtService } from '../utils/jwt';
import { encryptionService } from '../utils/encryption';
import { logInfo, logError, logWarn } from '../utils/logger';
import { User, CreateUserData, UpdateUserData } from '../models/User';

export interface LoginResponse {
  user: Omit<User, 'password_hash'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RegisterResponse {
  user: Omit<User, 'password_hash'>;
  message: string;
}

class AuthService {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  // Register new user
  async register(userData: { email: string; name: string; password: string }): Promise<RegisterResponse> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [userData.email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await encryptionService.hashPassword(userData.password);
      
      // Generate email verification token
      const emailVerificationToken = jwtService.generateEmailVerificationToken();

      // Create user
      const userId = uuidv4();
      const newUserData: CreateUserData = {
        email: userData.email.toLowerCase(),
        name: userData.name.trim(),
        password_hash: passwordHash,
        email_verification_token: emailVerificationToken
      };

      const result = await client.query(`
        INSERT INTO users (id, email, name, password_hash, email_verification_token)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, name, email_verified, created_at, updated_at
      `, [userId, newUserData.email, newUserData.name, newUserData.password_hash, newUserData.email_verification_token]);

      await client.query('COMMIT');

      const user = result.rows[0];
      
      logInfo('User registered successfully', { userId: user.id, email: user.email });

      return {
        user,
        message: 'Registration successful. Please check your email to verify your account.'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logError('User registration failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Login user
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Get user by email
      const result = await this.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];

      // Check password
      const isPasswordValid = await encryptionService.comparePassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        logWarn('Invalid login attempt', { email, ip: 'unknown' });
        throw new Error('Invalid credentials');
      }

      // Update last login
      await this.pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate tokens
      const tokens = jwtService.generateTokenPair({
        userId: user.id,
        email: user.email
      });

      // Remove sensitive data
      const { password_hash, email_verification_token, password_reset_token, ...userWithoutSensitiveData } = user;

      logInfo('User logged in successfully', { userId: user.id, email: user.email });

      return {
        user: userWithoutSensitiveData,
        tokens
      };
    } catch (error) {
      logError('User login failed', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwtService.verifyRefreshToken(refreshToken);
      
      // Check if user still exists
      const result = await this.pool.query(
        'SELECT id, email FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Generate new access token
      const accessToken = jwtService.generateAccessToken({
        userId: user.id,
        email: user.email
      });

      return { accessToken };
    } catch (error) {
      logError('Token refresh failed', error);
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      const result = await this.pool.query(
        'UPDATE users SET email_verified = true, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id, email',
        [token]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid verification token');
      }

      const user = result.rows[0];
      logInfo('Email verified successfully', { userId: user.id, email: user.email });
    } catch (error) {
      logError('Email verification failed', error);
      throw error;
    }
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const token = jwtService.generatePasswordResetToken();
      const expires = new Date(Date.now() + 3600000); // 1 hour from now

      const result = await this.pool.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3 RETURNING id',
        [token, expires, email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        // Don't reveal if email exists or not
        logWarn('Password reset requested for non-existent email', { email });
        return;
      }

      logInfo('Password reset requested', { email, userId: result.rows[0].id });
      
      // TODO: Send email with reset token
      // emailService.sendPasswordResetEmail(email, token);
    } catch (error) {
      logError('Password reset request failed', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if token is valid and not expired
      const result = await client.query(
        'SELECT id, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
        [token]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired reset token');
      }

      const user = result.rows[0];

      // Hash new password
      const passwordHash = await encryptionService.hashPassword(newPassword);

      // Update password and clear reset token
      await client.query(
        'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
        [passwordHash, user.id]
      );

      await client.query('COMMIT');

      logInfo('Password reset successfully', { userId: user.id, email: user.email });
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Password reset failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<Omit<User, 'password_hash'>> {
    try {
      const result = await this.pool.query(
        'SELECT id, email, name, email_verified, last_login, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      logError('Failed to get user profile', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updateData: { name?: string }): Promise<Omit<User, 'password_hash'>> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.name) {
        fields.push(`name = $${paramCount}`);
        values.push(updateData.name.trim());
        paramCount++;
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(userId);

      const result = await this.pool.query(`
        UPDATE users 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $${paramCount}
        RETURNING id, email, name, email_verified, last_login, created_at, updated_at
      `, values);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logInfo('User profile updated', { userId });
      return result.rows[0];
    } catch (error) {
      logError('Failed to update user profile', error);
      throw error;
    }
  }
}

export const authService = new AuthService();