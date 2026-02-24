/**
 * Database Migration Runner
 * Applies all pending SQL migrations to the database
 */

const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function runMigrations() {
  console.log('\n🔄 Starting database migrations...\n');

  const migrationsDir = path.join(__dirname, '../..', 'database/migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  // Read all SQL files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('ℹ️  No migration files found');
    process.exit(0);
  }

  // Create migrations tracking table if it doesn't exist
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Migrations table ready\n');
  } catch (err) {
    console.error('❌ Failed to create migrations table:', err.message);
    process.exit(1);
  }

  // Run each migration
  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      // Check if already executed
      const result = await pool.query('SELECT 1 FROM migrations WHERE name = $1', [file]);
      
      if (result.rows.length > 0) {
        console.log(`⏭️  SKIPPED: ${file} (already applied)`);
        skipped++;
        continue;
      }

      // Read and execute migration
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await pool.query(sql);
      await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      
      console.log(`✓ APPLIED: ${file}`);
      applied++;
    } catch (err) {
      console.error(`❌ FAILED: ${file}`);
      console.error(`   Error: ${err.message}\n`);
      // Continue with next migration instead of stopping
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Applied: ${applied} new`);
  console.log(`   Skipped: ${skipped} already applied`);
  console.log(`   Total:   ${files.length} files\n`);

  await pool.end();
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('❌ Migration runner failed:', err);
  process.exit(1);
});
