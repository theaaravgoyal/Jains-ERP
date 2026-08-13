const Redis = require('ioredis');

const isProduction = process.env.NODE_ENV === 'production';
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisDb = parseInt(process.env.REDIS_DB || '0', 10);

const hasExplicitRedis = !!(redisUrl || (process.env.REDIS_HOST && process.env.REDIS_HOST !== '127.0.0.1'));

const isRedisConfigured = () => {
  if (isProduction && !hasExplicitRedis) {
    return false;
  }
  return true;
};

// Auto-detect TLS if secure scheme is used
const isTls = (redisUrl && redisUrl.startsWith('rediss://')) || process.env.REDIS_TLS === 'true';
const redisTls = isTls ? {} : undefined;

const parseRedisUrl = (url) => {
  if (!url) return {};
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      username: parsed.username || undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      db: parseInt(parsed.pathname.slice(1) || '0', 10)
    };
  } catch (e) {
    console.warn('[Redis] Failed to parse REDIS_URL:', e.message);
    return {};
  }
};

const connectionConfig = redisUrl ? parseRedisUrl(redisUrl) : {
  host: redisHost,
  port: redisPort,
  password: redisPassword || undefined,
  db: redisDb
};

const redisConnectionOptions = {
  ...connectionConfig,
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

const getRedisClient = () => {
  if (!isRedisConfigured()) {
    console.log('[Redis Warning] Redis is not configured. Main caching client disabled.');
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(redisConnectionOptions);

      redisClient.on('connect', () => {
        console.log(`[Redis] Connecting to Redis server at ${redisConnectionOptions.host}:${redisConnectionOptions.port}...`);
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
    } catch (e) {
      console.warn('[Redis] Initialization skipped:', e.message);
      return null;
    }
  }
  return redisClient;
};

const isRedisReady = () => isConnected;

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
  isRedisConfigured,
  closeRedis
};
