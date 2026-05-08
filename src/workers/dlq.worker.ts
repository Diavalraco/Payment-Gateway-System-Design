import { EachMessagePayload } from 'kafkajs';
import { runConsumer, waitForConsumerDisconnect } from '../infrastructure/kafka/kafka.consumer';
import { KafkaTopics } from '../infrastructure/kafka/kafka.topics';
import { createLogger } from '../infrastructure/logger/logger';
import { publishMessage } from '../infrastructure/kafka/kafka.producer';

const logger = createLogger('dlq-worker');

export interface DlqPayload {
  paymentId: string;
  retryCount: number;
  failureReason: string;
  failedAt: string;
}

export async function startDlqWorker(signal: AbortSignal): Promise<void> {
  logger.warn({ msg: 'DLQ worker running (consumes payment.dlq)' });
  const stop = await runConsumer(
    'dlq-consumer-group',
    [KafkaTopics.PAYMENT_DLQ],
    async (msg: EachMessagePayload) => {
      signal.throwIfAborted();
      const raw = msg.message.value?.toString();
      if (!raw) return;
      const body = JSON.parse(raw) as DlqPayload;
      logger.error(body, 'DLQ_RECORD');
    },
  );

  await waitForConsumerDisconnect(signal, stop);
}

export async function enqueueReplayForManualTooling(dlqPayload: DlqPayload): Promise<void> {
  await publishMessage({
    topic: KafkaTopics.PAYMENT_RETRY_REPLAY,
    messages: [
      {
        key: dlqPayload.paymentId,
        value: JSON.stringify({
          paymentId: dlqPayload.paymentId,
          retryCount: dlqPayload.retryCount + 1,
          reason: `manual_replay:${dlqPayload.failureReason}`,
          executeAt: new Date().toISOString(),
          replay: true,
        }),
      },
    ],
  });
  logger.warn({ paymentId: dlqPayload.paymentId }, 'manual replay message published');
}
