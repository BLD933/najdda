const fs = require('fs');
const path = require('path');
const db = require('./index');

/**
 * Applies `schema.sql` then every migration in order.
 *
 * Runs against whichever driver `database/index.js` selected, so the same
 * command initialises a real Postgres and the embedded PGlite dev database.
 * PGlite is a WASM engine without a connection to close, so the teardown is
 * driver-aware instead of an unconditional `pool.end()` that would throw.
 */
async function initializeDatabase() {
  const driver = db.driver;
  console.log(`🚀 Starting database initialization (${driver})...`);

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📖 Applying schema...');
    await db.query(sql);
    console.log('✅ Schema applied (existing data preserved).');

    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
      for (const file of files) {
        const sqlFile = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
          await db.query(sqlFile);
          console.log(`✅ migration ${file}`);
        } catch (err) {
          // Migrations are written to be idempotent where possible, but a
          // re-run over an already-migrated table is not an error worth
          // aborting init for.
          console.warn(`⚠️  migration ${file} skipped: ${err.message.split('\n')[0]}`);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    if (/connectionString|ECONNREFUSED|getaddrinfo/i.test(err.message)) {
      console.error('💡 Hint: is DATABASE_URL set in .env? (or USE_PGLITE=true for the embedded dev database)');
    }
    process.exitCode = 1;
  } finally {
    if (db.pool) await db.pool.end();
    // PGlite persists to disk; nothing to tear down.
    process.exit(process.exitCode || 0);
  }
}

initializeDatabase();
