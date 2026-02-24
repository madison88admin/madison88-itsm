/**
 * Database Connection Configuration
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log client connect at DEBUG level to avoid noisy INFO logs during normal operation
pool.on('connect', () => {
  logger.debug('New database client connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

// Test connection on startup
// Test connection on startup once and report at INFO level
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection test failed', { error: err.message });
  } else {
    logger.info('Database connection test successful', { now: res.rows[0] });
  }
});

module.exports = pool;
