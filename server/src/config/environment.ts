import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  JWT_SECRET: string;
  CLIENT_URL?: string;
}

const requiredEnvVars = ['JWT_SECRET'];

// Validate required environment variables
const validateEnv = (): EnvironmentConfig => {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    JWT_SECRET: process.env.JWT_SECRET!,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  };
};

export const config = validateEnv();

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';