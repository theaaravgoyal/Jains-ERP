const Redis = require('ioredis');

// Build Redis connection options
const isProduction = process.env.NODE_ENV === 'production';
const hasExplicitRedis = !!(process.env.REDIS_URL || (process.env.REDIS_HOST && process.env.REDIS_HOST !== '127.0.0.1'));
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisDb = parseInt(process.env.REDIS_DB || '0', 10);
const redisTls = process.env.REDIS_TLS === 'true' ? {} : undefined;
const redisUrl = process.env.REDIS_URL;

const isRedisConfigured = () => {
  if (isProduction && !hasExplicitRedis) {
    return false;
  }
  return true;
};

/**
 * Standard Redis options for general app caching & BullMQ compatibility
 */
const redisConnectionOptions = redisUrl
  ? {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      connectTimeout: 4000,
      tls: redisTls
    }
  : {
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      db: redisDb,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      connectTimeout: 4000,
      tls: redisTls,
      retryStrategy(times) {
        if (times > 2) {
          return null; // Don't retry endlessly
        }
        return Math.min(times * 300, 1500);
      }
    };

let redisClient = null;
let isConnected = false;

/**
 * Initialize or retrieve the global Redis client
 */
const getRedisClient = () => {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!redisClient) {
    try {
      if (redisUrl) {
        redisClient = new Redis(redisUrl, redisConnectionOptions);
      } else {
        redisClient = new Redis(redisConnectionOptions);
      }

      redisClient.on('connect', () => {
        console.log(`[Redis] Connecting to Redis server at ${redisUrl ? redisUrl : `${redisHost}:${redisPort}`}...`);
      });

      redisClient.on('ready', () => {
        isConnected = true;
        console.log('[Redis] Redis client is ready and connected.');
      });

      redisClient.on('error', (err) => {
        isConnected = false;
        console.warn(`[Redis Notice] Connection notice: ${err.message}`);
      });

      redisClient.on('close', () => {
        isConnected = false;
      });

      redisClient.on('reconnecting', (time) => {
        console.log(`[Redis] Reconnecting in ${time}ms...`);
      });
    } catch (e) {
      console.warn('[Redis] Initialization skipped:', e.message);
      return null;
    }
  }

  return redisClient;
};

/**
 * Check if Redis is currently connected
 */
const isRedisReady = () => isConnected;

/**
 * Gracefully close Redis client
 */
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      isConnected = false;
      redisClient = null;
      console.log('[Redis] Connection closed gracefully.');
    } catch (err) {
      console.error('[Redis] Error during quit, forcing disconnect:', err.message);
      redisClient?.disconnect();
      redisClient = null;
    }
  }
};

module.exports = {
  getRedisClient,
  redisConnectionOptions,
  isRedisReady,
  closeRedis
};
