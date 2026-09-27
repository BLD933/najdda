const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Leave undefined so node-postgres honours `sslmode` from the connection string.
  // A hardcoded ssl:true breaks any Postgres without TLS (local dev, docker).
  // DATABASE_SSL=require forces it on for hosted providers like Neon.
  ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : undefined,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
