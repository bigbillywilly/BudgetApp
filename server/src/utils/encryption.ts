// server/src/utils/encryption.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { logError } from './logger';

// Encryption and hashing utilities for sensitive data and authentication
class EncryptionService {
  private saltRounds: number;
  private algorithm: string;
  private secretKey: string;

  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    this.algorithm = 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long!';
  }

  // Hash password using bcrypt
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      logError('Error hashing password', error);
      throw new Error('Password hashing failed');
    }
  }

  // Compare plaintext password to hash
  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logError('Error comparing password', error);
      throw new Error('Password comparison failed');
    }
  }

  // Encrypt sensitive text using AES-256-CBC
  encrypt(text: string): { encrypted: string; iv: string } {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.secretKey, 'salt', 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex')
      };
    } catch (error) {
      logError('Error encrypting data', error);
      throw new Error('Encryption failed');
    }
  }

  // Decrypt AES-256-CBC encrypted data
  decrypt(encryptedData: { encrypted: string; iv: string }): string {
    try {
      const key = crypto.scryptSync(this.secretKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(encryptedData.iv, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logError('Error decrypting data', error);
      throw new Error('Decryption failed');
    }
  }

  // Generate cryptographically secure random string
  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash arbitrary data using SHA-256 (not reversible)
  hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const encryptionService = new EncryptionService();
