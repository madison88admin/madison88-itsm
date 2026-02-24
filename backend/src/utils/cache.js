/**
 * Cache Utility
 * Provides caching functions with Redis fallback to memory cache
 */

const logger = require('./logger');

class CacheManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.memoryCache = {}; // Fallback in-memory cache
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null if not found
   */
  async get(key) {
    try {
      if (this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          logger.debug(`Cache hit: ${key}`);
          return JSON.parse(value);
        }
      } else if (this.memoryCache[key]) {
        // Check if memory cache entry is expired
        if (this.memoryCache[key].expireAt > Date.now()) {
          logger.debug(`Cache hit (memory): ${key}`);
          return this.memoryCache[key].value;
        } else {
          delete this.memoryCache[key];
        }
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (err) {
      logger.warn(`Cache get error for ${key}`, { error: err.message });
      return null; // Return null on error, don't crash
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   */
  async set(key, value, ttl = 300) {
    try {
      if (this.redis) {
        await this.redis.setEx(key, ttl, JSON.stringify(value));
        logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      } else {
        // Memory cache with expiration
        this.memoryCache[key] = {
          value,
          expireAt: Date.now() + ttl * 1000,
        };
        logger.debug(`Cache set (memory): ${key} (TTL: ${ttl}s)`);
      }
    } catch (err) {
      logger.warn(`Cache set error for ${key}`, { error: err.message });
      // Don't throw, just log - cache failure shouldn't break the app
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        delete this.memoryCache[key];
      }
      logger.debug(`Cache deleted: ${key}`);
    } catch (err) {
      logger.warn(`Cache delete error for ${key}`, { error: err.message });
    }
  }

  /**
   * Clear all cache matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'templates:*')
   */
  async clear(pattern) {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
          logger.debug(`Cache cleared ${keys.length} entries matching ${pattern}`);
        }
      } else {
        // Memory cache: delete matching keys
        Object.keys(this.memoryCache).forEach((key) => {
          if (this.matchPattern(pattern, key)) {
            delete this.memoryCache[key];
          }
        });
        logger.debug(`Cache cleared (memory): ${pattern}`);
      }
    } catch (err) {
      logger.warn(`Cache clear error for ${pattern}`, { error: err.message });
    }
  }

  /**
   * Simple pattern matching (supports * wildcard)
   * @param {string} pattern - Pattern (e.g., 'templates:*')
   * @param {string} key - Key to test
   * @returns {boolean} True if key matches pattern
   */
  matchPattern(pattern, key) {
    const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
    return regex.test(key);
  }
}

module.exports = CacheManager;
