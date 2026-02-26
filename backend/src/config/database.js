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

// Env-driven pool and retry configuration
const MAX_CONN = Number(process.env.DB_MAX_CONN) || Number(process.env.DB_POOL_MAX) || 6;
const MIN_CONN = Number(process.env.DB_MIN_CONN) || 0;
const IDLE_TIMEOUT_MS = Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000;
const CONNECTION_TIMEOUT_MS = Number(process.env.DB_CONN_TIMEOUT_MS) || 10000;
const STATEMENT_TIMEOUT_MS = Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 60000;
const QUERY_TIMEOUT_MS = Number(process.env.DB_QUERY_TIMEOUT_MS) || Math.max(STATEMENT_TIMEOUT_MS + 5000, 65000);
const RETRY_COUNT = Number(process.env.DB_RETRY_COUNT) || 5;
const RETRY_DELAY_MS = Number(process.env.DB_RETRY_DELAY_MS) || 3000;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: MAX_CONN,
  min: MIN_CONN,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  application_name: 'madison88-itsm-backend',
  allowExitOnIdle: true,
  statement_timeout: STATEMENT_TIMEOUT_MS,
  query_timeout: QUERY_TIMEOUT_MS,
});

// Log client connect at DEBUG level to avoid noisy INFO logs during normal operation
pool.on('connect', () => {
  logger.debug('New database client connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err.message });
});

const isDbTimeoutError = (message = '') => {
  const text = String(message).toLowerCase();
  return text.includes('timeout')
    || text.includes('statement timeout')
    || text.includes('query read timeout')
    || text.includes('connection terminated due to connection timeout')
    || text.includes('timeout exceeded when trying to connect');
};

const summarizeQueryArgs = (args = []) => {
  const text = typeof args?.[0] === 'string'
    ? args[0]
    : typeof args?.[0]?.text === 'string'
      ? args[0].text
      : '';
  return text ? text.replace(/\s+/g, ' ').trim().slice(0, 180) : null;
};

const originalQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  const startedAt = Date.now();
  try {
    const result = await originalQuery(...args);
    const durationMs = Date.now() - startedAt;
    if (durationMs >= Math.max(QUERY_TIMEOUT_MS - 1000, 30000)) {
      logger.warn('Slow database query detected', {
        durationMs,
        query: summarizeQueryArgs(args),
      });
    }
    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    if (isDbTimeoutError(err?.message)) {
      logger.error('Database timeout while executing query', {
        durationMs,
        query: summarizeQueryArgs(args),
        error: err.message,
      });
    }
    throw err;
  }
};

// Test connection with retry on startup
const testConnection = async (retries = RETRY_COUNT, delay = RETRY_DELAY_MS) => {
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

// Kick off connection test but do not block module load
testConnection().then((ok) => {
  if (!ok) {
    logger.error('Initial DB connection attempts failed — check DATABASE_URL, credentials, network rules and pool settings');
  }
}).catch((e) => {
  logger.error('DB connection test threw unexpected error', { error: e.message });
});

module.exports = pool;
