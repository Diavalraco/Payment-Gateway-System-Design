import { getRedis } from './redis.client';
import { loadEnv } from '../config/env';

const PREFIX = 'lock:payment';

export async function acquirePaymentLock(
  paymentId: string,
  token: string,
  ttlMs?: number,
): Promise<boolean> {
  const ttl = ttlMs ?? loadEnv().PAYMENT_LOCK_TTL_MS;
  const key = `${PREFIX}:${paymentId}`;
  const r = getRedis();
  const res = await r.set(key, token, 'PX', ttl, 'NX');
  return res === 'OK';
}

export async function releasePaymentLock(paymentId: string, token: string): Promise<void> {
  const key = `${PREFIX}:${paymentId}`;
  const lua = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await getRedis().eval(lua, 1, key, token);
}

export async function extendPaymentLock(paymentId: string, token: string, ttlMs: number): Promise<boolean> {
  const key = `${PREFIX}:${paymentId}`;
  const lua = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
  const res = await getRedis().eval(lua, 1, key, token, ttlMs);
  return res === 1;
}
