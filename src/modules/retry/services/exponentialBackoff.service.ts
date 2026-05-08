import { loadEnv } from '../../../infrastructure/config/env';

export class ExponentialBackoffService {
  delayMs(retryCount: number, baseDelayMs?: number): number {
    const base = baseDelayMs ?? loadEnv().RETRY_BASE_DELAY_MS;
    const raw = base * Math.pow(2, Math.max(0, retryCount));
    const jitter = Math.floor(Math.random() * Math.min(raw * 0.2, 2000));
    return Math.min(raw + jitter, 15 * 60 * 1000);
  }

  computeExecuteAt(retryCount: number, baseDelayMs?: number): Date {
    return new Date(Date.now() + this.delayMs(retryCount, baseDelayMs));
  }
}

export const exponentialBackoff = new ExponentialBackoffService();
