const env = require("../config/env");
const logger = require("../utils/logger");

const memoryCache = new Map();
const MAX_MEMORY_ITEMS = 500;
let redisClientPromise = null;

const resetRedisClient = () => {
  redisClientPromise = null;
};

const isRedisClientUsable = (client) =>
  Boolean(client && client.isOpen !== false && client.isReady !== false);

const getRedisClient = async () => {
  if (!env.redisUrl) {
    return null;
  }

  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      try {
        const { createClient } = require("redis");
        const client = createClient({ url: env.redisUrl });

        client.on("error", (error) => {
          logger.warn("Redis cache error", { error: error.message });

          if (!isRedisClientUsable(client)) {
            resetRedisClient();
          }
        });
        client.on("end", () => {
          logger.warn("Redis cache connection closed; using memory cache.");
          resetRedisClient();
        });

        await client.connect();
        logger.info("Redis cache connected");
        return client;
      } catch (error) {
        logger.warn("Redis cache unavailable; using memory cache", {
          error: error.message,
        });
        resetRedisClient();
        return null;
      }
    })();
  }

  const client = await redisClientPromise;

  if (!isRedisClientUsable(client)) {
    resetRedisClient();
    return null;
  }

  return client;
};

const getMemoryValue = (key) => {
  const entry = memoryCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
};

const setMemoryValue = (key, value, ttlSeconds) => {
  if (memoryCache.size >= MAX_MEMORY_ITEMS) {
    memoryCache.delete(memoryCache.keys().next().value);
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const getCache = async (key) => {
  const client = await getRedisClient();

  if (client) {
    try {
      const rawValue = await client.get(key);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
      logger.warn("Redis cache read failed; using memory cache", {
        error: error.message,
      });
      resetRedisClient();
      return getMemoryValue(key);
    }
  }

  return getMemoryValue(key);
};

const setCache = async (key, value, ttlSeconds = 3600) => {
  const client = await getRedisClient();

  if (client) {
    try {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return;
    } catch (error) {
      logger.warn("Redis cache write failed; using memory cache", {
        error: error.message,
      });
      resetRedisClient();
    }
  }

  setMemoryValue(key, value, ttlSeconds);
};

const clearMemoryCache = () => {
  memoryCache.clear();
};

module.exports = {
  clearMemoryCache,
  getCache,
  setCache,
};
