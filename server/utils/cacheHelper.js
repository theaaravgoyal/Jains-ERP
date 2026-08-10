const { getRedisClient, isRedisReady } = require('../config/redis');

/**
 * Cache Helper for Redis
 * Provides safe getters, setters, cache-remember wrappers, and pattern invalidation.
 */
class CacheHelper {
  constructor() {
    this.defaultTTL = 300; // 5 minutes default
  }

  getClient() {
    try {
      return getRedisClient();
    } catch (e) {
      return null;
    }
  }

  /**
   * Retrieve cached value (auto JSON-parsed)
   */
  async get(key) {
    try {
      const client = this.getClient();
      if (!client || !isRedisReady()) return null;

      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.warn(`[Cache GET Error] key=${key}:`, err.message);
      return null;
    }
  }

  /**
   * Set cached value with TTL in seconds
   */
  async set(key, value, ttlSeconds = this.defaultTTL) {
    try {
      const client = this.getClient();
      if (!client || !isRedisReady()) return false;

      const stringValue = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await client.setex(key, ttlSeconds, stringValue);
      } else {
        await client.set(key, stringValue);
      }
      return true;
    } catch (err) {
      console.warn(`[Cache SET Error] key=${key}:`, err.message);
      return false;
    }
  }

  /**
   * Delete a single key
   */
  async del(key) {
    try {
      const client = this.getClient();
      if (!client || !isRedisReady()) return false;

      await client.del(key);
      return true;
    } catch (err) {
      console.warn(`[Cache DEL Error] key=${key}:`, err.message);
      return false;
    }
  }

  /**
   * Delete all keys matching a glob pattern (e.g. "report:*", "dashboard:*")
   */
  async delByPattern(pattern) {
    try {
      const client = this.getClient();
      if (!client || !isRedisReady()) return false;

      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
      return true;
    } catch (err) {
      console.warn(`[Cache delByPattern Error] pattern=${pattern}:`, err.message);
      return false;
    }
  }

  /**
   * Cache-Aside pattern: Return cached value if exists, else compute, cache and return
   */
  async remember(key, ttlSeconds, computeFn) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await computeFn();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }

  /**
   * Flush all Redis keys in current DB (Use with caution)
   */
  async flush() {
    try {
      const client = this.getClient();
      if (!client || !isRedisReady()) return false;
      await client.flushdb();
      return true;
    } catch (err) {
      console.warn('[Cache FLUSH Error]:', err.message);
      return false;
    }
  }
}

module.exports = new CacheHelper();
