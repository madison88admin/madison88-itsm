/**
 * Redis Connection Configuration
 * Set REDIS_ENABLED=false or omit REDIS_URL (and REDIS_HOST/REDIS_PORT) to run without Redis.
 * Idempotency for ticket creation will be skipped when Redis is unavailable.
 */

const redis = require('redis');
const logger = require('../utils/logger');

const enabled =
  process.env.REDIS_ENABLED !== 'false' &&
  (process.env.REDIS_URL || (process.env.REDIS_HOST && process.env.REDIS_PORT));

if (!enabled) {
  logger.info('Redis disabled (REDIS_ENABLED=false or no REDIS_URL/REDIS_HOST:REDIS_PORT). Idempotency will be skipped.');
  module.exports = null;
  return;
}

const url =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const redisClient = redis.createClient({
  url,
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    // Stop reconnecting after a few attempts to avoid log spam when Redis is down
    reconnectStrategy: (retries) => {
      if (retries >= 3) return new Error('Redis: stop reconnecting');
      return Math.min(retries * 200, 1000);
    },
  },
});

let errorLogged = false;
redisClient.on('connect', () => {
  logger.info('Redis connection established');
});
redisClient.on('error', (err) => {
  if (!errorLogged) {
    errorLogged = true;
    logger.error('Redis connection error:', err.message || err);
  }
});
redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.connect().catch((err) => {
  logger.error('Failed to connect to Redis:', err.message || err);
  // Leave client in error state; app uses req.app.get('redis') and checks for null in controller.
  // This module still exports the client; calls to get/setEx may fail until connected.
});

module.exports = redisClient;
