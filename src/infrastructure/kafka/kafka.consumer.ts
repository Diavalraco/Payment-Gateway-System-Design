import { Consumer, EachMessagePayload } from 'kafkajs';
import { getKafka } from './kafka.client';
import { KafkaTopic } from './kafka.topics';
import { createLogger } from '../logger/logger';

const logger = createLogger('kafka-consumer');

export async function createConsumer(groupId: string): Promise<Consumer> {
  const consumer = getKafka().consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });
  await consumer.connect();
  return consumer;
}

export type MessageHandler = (payload: EachMessagePayload) => Promise<void>;

export async function runConsumer(
  groupId: string,
  topics: KafkaTopic[],
  handler: MessageHandler,
): Promise<() => Promise<void>> {
  const consumer = await createConsumer(groupId);
  await consumer.subscribe({ topics: topics as string[], fromBeginning: false });
  void consumer.run({
    partitionsConsumedConcurrently: 3,
    eachMessage: async (payload) => {
      try {
        await handler(payload);
      } catch (err) {
        logger.error({ err, topic: payload.topic, partition: payload.partition }, 'consume failed');
        throw err;
      }
    },
  });

  return async () => {
    try {
      await consumer.disconnect();
    } catch (err) {
      logger.warn({ err }, 'consumer.disconnect');
    }
  };
}

/**
 * After `signal` aborts (or immediately if already aborted), run `disconnect` and resolve.
 */
export function waitForConsumerDisconnect(signal: AbortSignal, disconnect: () => Promise<void>): Promise<void> {
  return new Promise<void>((resolve) => {
    const teardown = async () => {
      try {
        await disconnect();
      } finally {
        resolve();
      }
    };
    if (signal.aborted) {
      void teardown();
      return;
    }
    signal.addEventListener('abort', () => void teardown(), { once: true });
  });
}
