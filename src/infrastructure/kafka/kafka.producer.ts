import { CompressionTypes, Producer, ProducerRecord } from 'kafkajs';
import { getKafka } from './kafka.client';
import { createLogger } from '../logger/logger';

const logger = createLogger('kafka-producer');

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = getKafka().producer({
      transactionalId: undefined,
      idempotent: true,
      maxInFlightRequests: 5,
    });
    await producer.connect();
  }
  return producer;
}

export interface PublishOptions {
  key?: string;
  headers?: Record<string, string>;
}

export async function publishMessage(record: Omit<ProducerRecord, 'compression'>, opts?: PublishOptions): Promise<void> {
  const p = await getProducer();
  await p.send({
    ...record,
    compression: CompressionTypes.GZIP,
    messages: record.messages.map((m) => ({
      ...m,
      key: opts?.key ?? m.key,
      headers: { ...opts?.headers, ...m.headers },
    })),
  });
  logger.debug({ topic: record.topic, msg: 'published' });
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
