/**
 * Database Connection Configuration
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,      // Supabase uses valid certificates
  },
  // Aggressive pooling for free tier (small concurrency)
  max: 5,                           // Match free tier limit (max 5 concurrent)
  min: 1,                           // Keep 1 connection alive
  idleTimeoutMillis: 10000,         // Release idle connections quickly (10s not 30s)
  connectionTimeoutMillis: 5000,    // Fail fast on timeout (5s not 30s)
  application_name: 'madison88-itsm-backend',
  allowExitOnIdle: true,            // Allow process to exit when idle
  
  // Connection recycling for free tier stability
  reapIntervalMillis: 1000,         // Check for idle connections every second
  statementTimeout: 30000,          // 30 second query timeout
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