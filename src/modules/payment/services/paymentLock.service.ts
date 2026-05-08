import { nanoid } from 'nanoid';
import * as distributedLock from '../../../infrastructure/redis/distributedLock.service';
import { createLogger } from '../../../infrastructure/logger/logger';
import { loadEnv } from '../../../infrastructure/config/env';

const logger = createLogger('payment-lock');

export interface LockHandle {
  token: string;
  release(): Promise<void>;
}

export class PaymentLockService {
  async tryLockPayment(paymentId: string): Promise<LockHandle | null> {
    const token = nanoid(24);
    const ok = await distributedLock.acquirePaymentLock(paymentId, token);
    if (!ok) {
      logger.warn({ paymentId }, 'failed to acquire distributed lock');
      return null;
    }
    const ttl = loadEnv().PAYMENT_LOCK_TTL_MS;
    const interval = setInterval(() => {
      void distributedLock.extendPaymentLock(paymentId, token, ttl).catch(() => undefined);
    }, Math.floor(ttl / 2));

    return {
      token,
      release: async () => {
        clearInterval(interval);
        await distributedLock.releasePaymentLock(paymentId, token);
      },
    };
  }
}

export const paymentLockService = new PaymentLockService();
