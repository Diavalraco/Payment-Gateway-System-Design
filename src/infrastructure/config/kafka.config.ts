import { loadEnv } from './env';

export function getKafkaConfig() {
  const e = loadEnv();
  return {
    brokers: e.KAFKA_BROKERS.split(',').map((b) => b.trim()),
    clientId: e.SERVICE_NAME,
  };
}
