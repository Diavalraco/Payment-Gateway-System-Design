import { getRedis } from './redis.client';
import { loadEnv } from '../config/env';

/**
 * Sliding window rate limit using sorted set (score = timestamp ms).
 */
export async function slidingWindowAllow(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const r = getRedis();
  const now = Date.now();
  const windowKey = `rl:${key}`;
  const start = now - windowMs;

  const multi = r.multi();
  multi.zremrangebyscore(windowKey, 0, start);
  multi.zcard(windowKey);
  const results = await multi.exec();
  const count = results?.[1]?.[1] as number | undefined;
  const currentCount = typeof count === 'number' ? count : 0;

  if (currentCount >= maxRequests) {
    const oldest = await r.zrange(windowKey, 0, 0, 'WITHSCORES');
    const oldestScore = oldest?.[1] ? Number(oldest[1]) : now - windowMs;
    const retryAfterMs = Math.max(0, oldestScore + windowMs - now);
    return { allowed: false, retryAfterMs };
  }

  await r.zadd(windowKey, now, `${now}-${Math.random()}`);
  await r.pexpire(windowKey, windowMs + 1000);

  return { allowed: true };
}

export async function slidingWindowDefaults(key: string): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const e = loadEnv();
  return slidingWindowAllow(key, e.RATE_LIMIT_MAX, e.RATE_LIMIT_WINDOW_MS);
}
