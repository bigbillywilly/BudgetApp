// test-app-connection.js - Test exactly how your app connects
require('dotenv').config();
const { Pool } = require('pg');

console.log('🧪 Testing database connection exactly like your app...\n');

// Use the exact same configuration as your app
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'moneywise',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  min: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
};

// Add SSL if needed
if (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

console.log('Configuration being used:');
console.log({
  host: poolConfig.host,
  port: poolConfig.port,
  database: poolConfig.database,
  user: poolConfig.user,
  max: poolConfig.max,
  min: poolConfig.min,
  ssl: poolConfig.ssl || 'disabled'
});
console.log('');

const pool = new Pool(poolConfig);

async function testConnection() {
  try {
    console.log('1. Creating connection pool...');
    
    console.log('2. Attempting to connect...');
    const client = await pool.connect();
    
    console.log('3. Connected! Running test query...');
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    
    console.log('4. Query successful!');
    console.log('   Current Time:', result.rows[0].current_time);
    console.log('   PostgreSQL Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
    
    client.release();
    
    console.log('5. Testing pool stats...');
    console.log('   Total connections:', pool.totalCount);
    console.log('   Idle connections:', pool.idleCount);
    console.log('   Waiting connections:', pool.waitingCount);
    
    await pool.end();
    console.log('\n✅ SUCCESS - Your app configuration should work!');
    
  } catch (error) {
    console.error('\n❌ FAILED - This is the same error your app sees:');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Detail:', error.detail);
    console.error('Full Error:', error);
    
    await pool.end().catch(() => {});
  }
}

testConnection();