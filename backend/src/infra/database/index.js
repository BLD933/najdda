const { Pool } = require('pg');
require('dotenv').config();

/**
 * Database access with two interchangeable drivers.
 *
 * Production and CI use `pg` against a real Postgres server. For local
 * development with no Docker and no system Postgres, `USE_PGLITE=true` swaps in
 * PGlite — the actual PostgreSQL engine compiled to WebAssembly — so
 * `schema.sql` and every repository query run unchanged.
 *
 * The exported shape is identical either way, so nothing above this file knows
 * which engine answered. PGlite is ESM-only, hence the dynamic import.
 */

const useEmbedded = process.env.USE_PGLITE === 'true';

let client = null;
let clientReady = null;

async function initEmbedded() {
  if (clientReady) return clientReady;
  clientReady = (async () => {
    const { PGlite } = await import('@electric-sql/pglite');
    const path = process.env.PGLITE_PATH || './.pglite';
    client = new PGlite(path);
    await client.waitReady;
    return client;
  })();
  return clientReady;
}

// Normalised to what `pg` returns, so repositories cannot tell the difference.
async function embeddedQuery(text, params = []) {
  const pg = await initEmbedded();
  // `pg` routes a parameterless query through the simple protocol and happily
  // runs a whole file of statements (schema.sql, migrations). PGlite's `query`
  // uses the extended protocol, which rejects that, so multi-statement scripts
  // go through `exec` — the same code path, one fewer special case.
  if (!params || params.length === 0) {
    const res = await pg.exec(text);
    const rows = Array.isArray(res) ? res[res.length - 1]?.rows || [] : (res?.rows || []);
    return { rows, rowCount: rows.length };
  }
  const res = await pg.query(text, params);
  const rows = res.rows || [];
  return { rows, rowCount: res.affectedRows ?? rows.length };
}

let pool = null;

if (useEmbedded) {
  module.exports = {
    query: (text, params) => embeddedQuery(text, params),
    get pool() { return null; },
    driver: 'pglite',
    isEmbedded: () => true,
    initEmbedded,
  };
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Leave undefined so node-postgres honours `sslmode` from the connection string.
    // A hardcoded ssl:true breaks any Postgres without TLS (local dev, docker).
    // DATABASE_SSL=require forces it on for hosted providers like Neon.
    ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : undefined,
  });
  module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    driver: 'pg',
    isEmbedded: () => false,
    initEmbedded: async () => null,
  };
}
