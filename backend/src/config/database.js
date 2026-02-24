/**
 * Database Connection Configuration
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Prefer building the connection string from explicit env vars when available
// This avoids issues when a raw DATABASE_URL contains unescaped characters (e.g. @ in password)
const buildConnectionString = () => {
  // Only build from components when a password is provided to avoid creating
  // an invalid connection string when the password is missing. Prefer
  // DATABASE_URL if it's present and DATABASE_PASSWORD is empty.
  const hasHostUser = process.env.DATABASE_HOST && process.env.DATABASE_USER;
  const hasPassword = typeof process.env.DATABASE_PASSWORD !== 'undefined' && process.env.DATABASE_PASSWORD !== '';
  if (hasHostUser && hasPassword) {
    const user = encodeURIComponent(process.env.DATABASE_USER);
    const pass = encodeURIComponent(process.env.DATABASE_PASSWORD);
    const host = process.env.DATABASE_HOST;
    const port = process.env.DATABASE_PORT || '5432';
    const db = process.env.DATABASE_NAME || 'postgres';
    return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
  }
  // Fallback to DATABASE_URL (may include encoded credentials)
  return process.env.DATABASE_URL || null;
};

const connectionString = buildConnectionString();

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,                          // Increase concurrent connections
  min: 1,                           // Keep more connections alive
  idleTimeoutMillis: 30000,         // Standard idle timeout
  connectionTimeoutMillis: 10000,   // Longer timeout for slower networks
  application_name: 'madison88-itsm-backend',
  allowExitOnIdle: true,
  reapIntervalMillis: 1000,
  statementTimeout: 60000,          // Increase query timeout to 60s
});

// Log client connect at DEBUG level to avoid noisy INFO logs during normal operation
pool.on('connect', () => {
  logger.debug('New database client connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err.message });
});

// Test connection with retry on startup
const testConnection = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection established');
      return true;
    } catch (err) {
      logger.warn(`Database connection attempt ${i + 1}/${retries} failed`, {
        error: err.message,
      });
      if (i < retries - 1) {
        logger.info(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  logger.error('Database connection failed after all retries');
  return false;
};

testConnection();

module.exports = pool;