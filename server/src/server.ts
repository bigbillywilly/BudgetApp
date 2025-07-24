// server/src/server.ts
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import MoneyWiseApp from './app';
import { logInfo, logError } from './utils/logger';


// Validate required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n💡 Please check your .env file or environment configuration');
  process.exit(1);
}

// Optional environment variables (warn if missing)
const optionalVars = [
  'OPENAI_API_KEY',
  'ENCRYPTION_KEY',
  'FRONTEND_URL'
];

const missingOptional = optionalVars.filter(varName => !process.env[varName]);
if (missingOptional.length > 0) {
  console.warn('⚠️  Optional environment variables not set (some features may be limited):');
  missingOptional.forEach(varName => console.warn(`   - ${varName}`));
}

// Start the application
async function startServer(): Promise<void> {
  try {
    console.log('🚀 Starting MoneyWise API server...\n');
    
    // Create and start the app
    const app = new MoneyWiseApp();
    await app.start();
    
  } catch (error) {
    console.error('❌ Failed to start MoneyWise server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});