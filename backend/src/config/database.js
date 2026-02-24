/**
 * Database Connection Configuration
 */

const { Pool } = require('pg');
const { URL } = require('url');
const logger = require('../utils/logger');

// Modify connection string for self-signed certificates (Neon pooler)
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && databaseUrl.includes('neon.tech')) {
  try {
    const url = new URL(databaseUrl);
    // Remove sslmode parameter and add sslmode=no-verify
    url.searchParams.delete('sslmode');
    url.searchParams.set('sslmode', 'no-verify');
    databaseUrl = url.toString();
    logger.debug('Modified connection string for Neon SSL');
  } catch (err) {
    logger.warn('Failed to parse DATABASE_URL, using as-is', { error: err.message });
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,      // Allow self-signed certificates
  },
  max: 10,                          // reduced from 20 (Render free tier limit)
  min: 2,                           // keep minimum connections alive
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,   // increased to 30s for slow connections
  application_name: 'madison88-itsm-backend',
  allowExitOnIdle: false,           // keep pool alive
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