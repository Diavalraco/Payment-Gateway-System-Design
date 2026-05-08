import { getRedis } from './redis.client';

const PREFIX = 'idem';
const TTL_SEC = 24 * 60 * 60;

export async function getCachedResponse(key: string): Promise<{ body: string; statusCode: number } | null> {
  const raw = await getRedis().get(`${PREFIX}:${key}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { body: string; statusCode: number };
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedResponse(
  key: string,
  body: unknown,
  statusCode: number,
): Promise<void> {
  await getRedis().setex(
    `${PREFIX}:${key}`,
    TTL_SEC,
    JSON.stringify({ body: JSON.stringify(body), statusCode }),
  );
}

export async function deleteCachedResponse(key: string): Promise<void> {
  await getRedis().del(`${PREFIX}:${key}`);
}
