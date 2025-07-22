// server/src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { Secret, SignOptions, JwtPayload } from 'jsonwebtoken';
import { logError } from './logger';

interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class JWTService {
  private accessTokenSecret: Secret;
  private refreshTokenSecret: Secret;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  // Generate access token
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(payload as JwtPayload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'moneywise-api',
        audience: 'moneywise-client'
      } as SignOptions);
    } catch (error) {
      logError('Error generating access token', error);
      throw new Error('Token generation failed');
    }
  }

  // Generate refresh token
  generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(payload as JwtPayload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'moneywise-api',
        audience: 'moneywise-client'
      } as SignOptions);
    } catch (error) {
      logError('Error generating refresh token', error);
      throw new Error('Token generation failed');
    }
  }

  // Generate both tokens
  generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  // Verify access token
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'moneywise-api',
        audience: 'moneywise-client'
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      logError('Error verifying access token', error);
      throw new Error('Token verification failed');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'moneywise-api',
        audience: 'moneywise-client'
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      logError('Error verifying refresh token', error);
      throw new Error('Token verification failed');
    }
  }

  // Generate password reset token
  generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate email verification token
  generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export const jwtService = new JWTService();