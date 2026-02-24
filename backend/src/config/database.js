/**
 * Database Connection Configuration
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,                          // reduced from 20 (Render free tier limit)
  min: 2,                           // keep minimum connections alive
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,           // keep pool alive
});

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