import { loadEnv } from './env';

export function getDbConfig() {
  return { url: loadEnv().DATABASE_URL };
}
