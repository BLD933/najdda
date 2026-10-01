require('dotenv').config();
const { Client } = require('pg');

// Script admin local : n'affiche JAMAIS les hashs. Compte + emails masqués uniquement.
async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(
    "SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 20"
  );
  console.log(res.rows.map((r) => ({ ...r, email: String(r.email).replace(/(^.).*(@.*$)/, '$1***$2') })));
  await client.end();
}

check().catch(console.error);
