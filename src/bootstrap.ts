import { loadEnv } from './infrastructure/config/env';
import { createTopicsIfNeeded } from './infrastructure/kafka/kafka.client';
import { initTracing, shutdownTracing } from './infrastructure/monitoring/tracing';
import { createLogger } from './infrastructure/logger/logger';
import { disconnectPrisma } from './infrastructure/database/prisma/prisma';
import { disconnectProducer } from './infrastructure/kafka/kafka.producer';
import { disconnectRedis, getRedis } from './infrastructure/redis/redis.client';

const logger = createLogger('bootstrap');

export async function bootstrapInfrastructure(): Promise<void> {
  loadEnv();
  await initTracing();

  logger.info({ msg: 'connecting infra' });
  getRedis();
  await createTopicsIfNeeded();
}

export async function shutdownInfrastructure(): Promise<void> {
  await disconnectProducer();
  await disconnectPrisma();
  await disconnectRedis();
  await shutdownTracing();
}
