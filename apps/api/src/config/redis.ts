import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isUpstash = redisUrl.startsWith('rediss://');

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,   // Required by BullMQ
  enableReadyCheck: false,      // Required by BullMQ
  connectTimeout: 10000,
  lazyConnect: true,            // Don't auto-connect on import — connect on demand
  retryStrategy: (times) => {
    // After 3 failed attempts, give up (don't spam logs)
    if (times > 3) {
      console.warn('⚠️  Redis unavailable after 3 attempts. BullMQ queues disabled.');
      return null; // Stop retrying
    }
    return Math.min(times * 1000, 3000); // Retry after 1s, 2s, 3s
  },
  ...(isUpstash && {
    tls: {},
    family: 4, // Force IPv4
  }),
});

redisConnection.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisConnection.on('ready', () => {
  console.log('✅ Redis ready — BullMQ queues active');
});

redisConnection.on('error', (err) => {
  // Only log once per error type, not spam
  if (!err.message.includes('ETIMEDOUT') || Math.random() < 0.05) {
    console.error('❌ Redis connection error:', err.message);
  }
});

// Attempt connection
redisConnection.connect().catch(() => {
  // Silently handled by retryStrategy
});
