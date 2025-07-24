// test-db.js - Test different PostgreSQL connections
const { Client } = require('pg');

const configs = [
  // Your .env config
  {
    host: 'localhost',
    port: 54321,
    database: 'moneywise',
    user: 'moneywise_user',
    password: 'MoneyWise2024'
  },
  // Default PostgreSQL config
  {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  },
  // Your user on default port
  {
    host: 'localhost',
    port: 5432,
    database: 'moneywise',
    user: 'moneywise_user',
    password: 'MoneyWise2024'
  }
];

async function testConnection(config, index) {
  const client = new Client(config);
  
  try {
    console.log(`\nTest ${index + 1}: Trying ${config.user}@${config.host}:${config.port}/${config.database}`);
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ SUCCESS!');
    console.log('PostgreSQL Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
    
    // Try to list databases
    const dbResult = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('Available databases:', dbResult.rows.map(row => row.datname).join(', '));
    
    await client.end();
    return true;
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    await client.end().catch(() => {});
    return false;
  }
}

async function testAll() {
  console.log('Testing PostgreSQL connections...\n');
  
  for (let i = 0; i < configs.length; i++) {
    const success = await testConnection(configs[i], i);
    if (success) {
      console.log('\n🎉 Found working configuration!');
      console.log('Update your .env file with these settings:');
      console.log(`DB_HOST=${configs[i].host}`);
      console.log(`DB_PORT=${configs[i].port}`);
      console.log(`DB_NAME=${configs[i].database}`);
      console.log(`DB_USER=${configs[i].user}`);
      console.log(`DB_PASSWORD=${configs[i].password}`);
      break;
    }
  }
}

testAll().catch(console.error);