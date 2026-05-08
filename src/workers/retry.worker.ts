import { EachMessagePayload } from 'kafkajs';
import { runConsumer, waitForConsumerDisconnect } from '../infrastructure/kafka/kafka.consumer';
import { KafkaTopics } from '../infrastructure/kafka/kafka.topics';
import { createLogger } from '../infrastructure/logger/logger';
import { executeRetryRelay, RetryKafkaPayload } from '../modules/retry/consumers/retry.consumer';

const logger = createLogger('retry-worker');

export async function startRetryWorker(signal: AbortSignal): Promise<void> {
  logger.info({ msg: 'retry worker subscribing' });
  const stop = await runConsumer(
    'retry-consumer-group',
    [KafkaTopics.PAYMENT_RETRY, KafkaTopics.PAYMENT_RETRY_REPLAY],
    async (msg: EachMessagePayload) => {
      signal.throwIfAborted();
      const raw = msg.message.value?.toString();
      if (!raw) return;
      const payload = JSON.parse(raw) as RetryKafkaPayload;
      signal.throwIfAborted();
      await executeRetryRelay(payload);
    },
  );

  await waitForConsumerDisconnect(signal, stop);
}
