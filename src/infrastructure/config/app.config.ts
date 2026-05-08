import { loadEnv } from './env';

export function getAppConfig() {
  const env = loadEnv();
  return {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    serviceName: env.SERVICE_NAME,
  };
}
