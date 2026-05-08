import { Kafka, logLevel as kafkaLogLevel } from 'kafkajs';
import { getKafkaConfig } from '../config/kafka.config';
import { loadEnv } from '../config/env';
import { createLogger } from '../logger/logger';

const logger = createLogger('kafka-client');

let kafkaInstance: Kafka | null = null;

export function getKafka(): Kafka {
  if (!kafkaInstance) {
    const cfg = getKafkaConfig();
    const env = loadEnv();
    kafkaInstance = new Kafka({
      clientId: cfg.clientId,
      brokers: cfg.brokers,
      logLevel: env.NODE_ENV === 'production' ? kafkaLogLevel.WARN : kafkaLogLevel.INFO,
      logCreator: () => ({ level, log }) => {
        const msg = log.message;
        switch (level) {
          case kafkaLogLevel.ERROR:
            logger.error({ msg });
            break;
          case kafkaLogLevel.WARN:
            logger.warn({ msg });
            break;
          default:
            logger.debug({ msg });
        }
      },
    });
  }
  return kafkaInstance;
}

export async function createTopicsIfNeeded(): Promise<void> {
  const { ALL_TOPICS } = await import('./kafka.topics');
  const kafka = getKafka();
  const admin = kafka.admin();
  await admin.connect();
  try {
    const existing = await admin.listTopics();
    await admin.createTopics({
      topics: ALL_TOPICS.filter((topic) => !existing.includes(topic)).map((topic) => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1,
      })),
      waitForLeaders: true,
    });
  } finally {
    await admin.disconnect();
  }
}
