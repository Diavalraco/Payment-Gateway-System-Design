import { publishMessage } from '../../../infrastructure/kafka/kafka.producer';
import { KafkaTopics } from '../../../infrastructure/kafka/kafka.topics';
import { prisma } from '../../../infrastructure/database/prisma/prisma';
import { paymentRetryCounter } from '../../../infrastructure/monitoring/metrics';
import { createLogger } from '../../../infrastructure/logger/logger';

const logger = createLogger('retry-consumer');

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export interface RetryKafkaPayload {
  paymentId: string;
  retryCount: number;
  reason?: string;
  executeAt: string;
  replay?: boolean;
  retryRecordId?: string;
}

export async function executeRetryRelay(payload: RetryKafkaPayload): Promise<void> {
  const target = Date.parse(payload.executeAt);
  const waitMs = Number.isFinite(target) ? Math.max(0, target - Date.now()) : 0;
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  await publishMessage({
    topic: KafkaTopics.PAYMENT_INITIATED,
    messages: [{ key: payload.paymentId, value: JSON.stringify({ paymentId: payload.paymentId }) }],
  });

  paymentRetryCounter.inc();

  if (payload.retryRecordId) {
    await prisma.retryEvent.updateMany({
      where: { id: payload.retryRecordId },
      data: { processed: true },
    });
  }

  logger.info({ paymentId: payload.paymentId }, 'replay payment.initiated after retry delay');
}
