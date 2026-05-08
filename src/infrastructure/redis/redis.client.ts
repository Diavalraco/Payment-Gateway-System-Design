import Redis from 'ioredis';
import { getRedisConfig } from '../config/redis.config';
import { createLogger } from '../logger/logger';

const logger = createLogger('redis');

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    const c = getRedisConfig();
    client = new Redis({
      host: c.host,
      port: c.port,
      password: c.password,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        logger.warn({ times, delay }, 'redis retry');
        return delay;
      },
    });
    client.on('error', (err) => logger.error({ err }, 'redis error'));
  }
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
