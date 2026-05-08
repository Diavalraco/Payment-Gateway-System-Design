import { loadEnv } from './env';

export function getRedisConfig() {
  const e = loadEnv();
  return {
    host: e.REDIS_HOST,
    port: e.REDIS_PORT,
    password: e.REDIS_PASSWORD,
  };
}
