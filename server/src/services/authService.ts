// server/src/services/authService.ts
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
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

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Auth service for registration, login, token management, and profile updates
class AuthService {
  private pool: Pool;
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.pool = db.getPool();
    this.initializeEmailTransporter();
  }

  // Initialize email transporter with configuration
  private initializeEmailTransporter(): void {
    try {
      // Email configuration from environment variables
      const emailConfig: EmailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '' // Use app password for Gmail
        }
      };

      // Only initialize if SMTP credentials are provided
      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransport(emailConfig);

        // Verify SMTP connection
        this.emailTransporter.verify((error, success) => {
          if (error) {
            logError('SMTP configuration error', error);
            this.emailTransporter = null;
          } else {
            logInfo('SMTP server is ready to send emails');
          }
        });
      } else {
        logWarn('SMTP credentials not provided - email functionality disabled');
      }
    } catch (error) {
      logError('Failed to initialize email transporter', error);
      this.emailTransporter = null;
    }
  }

  // Send email verification email
  private async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    if (!this.emailTransporter) {
      logWarn('Email transporter not available - skipping verification email');
      return;
    }

    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || 'MoneyWise',
          address: process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@moneywise.com'
        },
        to: email,
        subject: 'Verify Your MoneyWise Account',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to MoneyWise!</h1>
            </div>
            
            <div style="padding: 40px 20px; background-color: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Hi ${name},</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for signing up for MoneyWise! To complete your registration and start tracking your finances, 
                please verify your email address by clicking the button below.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, you can copy and paste this link into your browser:
                <br>
                <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
              </p>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                This verification link will expire in 24 hours. If you didn't create an account with MoneyWise, 
                you can safely ignore this email.
              </p>
            </div>
            
            <div style="background-color: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
              <p>© 2024 MoneyWise. All rights reserved.</p>
            </div>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logInfo('Verification email sent successfully', { email });
    } catch (error) {
      logError('Failed to send verification email', error);
      // Don't throw error to prevent registration failure due to email issues
    }
  }

  // Send password reset email
  private async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    if (!this.emailTransporter) {
      logWarn('Email transporter not available - skipping password reset email');
      return;
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || 'MoneyWise',
          address: process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@moneywise.com'
        },
        to: email,
        subject: 'Reset Your MoneyWise Password',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
            </div>
            
            <div style="padding: 40px 20px; background-color: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Hi ${name},</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                We received a request to reset your MoneyWise account password. If you made this request, 
                click the button below to create a new password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, you can copy and paste this link into your browser:
                <br>
                <a href="${resetUrl}" style="color: #ff6b6b; word-break: break-all;">${resetUrl}</a>
              </p>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
                  🔒 Security Notice
                </p>
                <p style="color: #856404; font-size: 14px; margin: 5px 0 0 0;">
                  This reset link will expire in 1 hour for your security. If you didn't request a password reset, 
                  please ignore this email or contact support if you have concerns.
                </p>
              </div>
            </div>
            
            <div style="background-color: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
              <p>© 2024 MoneyWise. All rights reserved.</p>
              <p>If you're having trouble, contact us at support@moneywise.com</p>
            </div>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logInfo('Password reset email sent successfully', { email });
    } catch (error) {
      logError('Failed to send password reset email', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Register new user with email verification
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

      // Hash password and generate verification token
      const passwordHash = await encryptionService.hashPassword(userData.password);
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

      // Send verification email (async, don't wait for it)
      this.sendVerificationEmail(user.email, user.name, emailVerificationToken).catch(error => {
        logError('Failed to send verification email after registration', error);
      });

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

  // Authenticate user and issue tokens
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }
      const user = result.rows[0];

      // Validate password
      const isPasswordValid = await encryptionService.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        logWarn('Invalid login attempt', { email, ip: 'unknown' });
        throw new Error('Invalid credentials');
      }

      // Update last login timestamp
      await this.pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate JWT tokens
      const tokens = jwtService.generateTokenPair({
        userId: user.id,
        email: user.email
      });

      // Remove sensitive fields
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

  // Refresh access token using refresh token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwtService.verifyRefreshToken(refreshToken);

      // Ensure user still exists
      const result = await this.pool.query(
        'SELECT id, email FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      const user = result.rows[0];

      // Issue new access token
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

  // Mark email as verified using token
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

  // Generate password reset token and send email
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const token = jwtService.generatePasswordResetToken();
      const expires = new Date(Date.now() + 3600000); // 1 hour from now

      const result = await this.pool.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3 RETURNING id, name',
        [token, expires, email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        logWarn('Password reset requested for non-existent email', { email });
        // Don't reveal whether the email exists or not for security
        return;
      }

      const user = result.rows[0];

      // Send password reset email
      await this.sendPasswordResetEmail(email, user.name, token);

      logInfo('Password reset requested and email sent', { email, userId: user.id });
    } catch (error) {
      logError('Password reset request failed', error);
      throw error;
    }
  }

  // Reset user password using token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Validate token and expiration
      const result = await client.query(
        'SELECT id, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
        [token]
      );
      if (result.rows.length === 0) {
        throw new Error('Invalid or expired reset token');
      }
      const user = result.rows[0];

      // Hash new password and clear reset token
      const passwordHash = await encryptionService.hashPassword(newPassword);
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

  // Retrieve user profile (excluding password hash)
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

  // Update user profile fields (name only for now)
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

  // Get email transporter status for health checks
  getEmailStatus(): { enabled: boolean; configured: boolean } {
    return {
      enabled: this.emailTransporter !== null,
      configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
    };
  }
}

export const authService = new AuthService();