import { EachMessagePayload } from 'kafkajs';
import { runConsumer, waitForConsumerDisconnect } from '../infrastructure/kafka/kafka.consumer';
import { KafkaTopics } from '../infrastructure/kafka/kafka.topics';
import { createLogger } from '../infrastructure/logger/logger';

const logger = createLogger('webhook-worker');

/** Internal async topic for simulated gateway-push fan-out (placeholder). */
export async function startWebhookWorker(signal: AbortSignal): Promise<void> {
  const stop = await runConsumer(
    'webhook-internal-group',
    [KafkaTopics.PAYMENT_WEBHOOK],
    async (msg: EachMessagePayload) => {
      signal.throwIfAborted();
      const raw = msg.message.value?.toString();
      if (!raw) return;
      logger.info({ raw }, 'internal webhook bus message');
    },
  );

  await waitForConsumerDisconnect(signal, stop);
}
