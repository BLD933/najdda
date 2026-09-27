const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');
  
  try {
    // Read the schema.sql file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📖 Applying new schema...');
    await pool.query(sql);

    console.log('✅ Tables verified without deleting existing data.');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    if (err.message.includes('connectionString')) {
      console.error('💡 Hint: Make sure DATABASE_URL is set in your .env file.');
    }
  } finally {
    await pool.end();
    process.exit();
  }
}

initializeDatabase();
