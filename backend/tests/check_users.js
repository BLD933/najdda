require('dotenv').config();
const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  const res = await client.query('SELECT email, password FROM users');
  console.log(res.rows);
  await client.end();
}

check().catch(console.error);
