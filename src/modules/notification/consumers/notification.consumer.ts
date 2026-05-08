import { EachMessagePayload } from 'kafkajs';
import { runConsumer, waitForConsumerDisconnect } from '../../../infrastructure/kafka/kafka.consumer';
import { KafkaTopics } from '../../../infrastructure/kafka/kafka.topics';
import { notificationService } from '../services/notification.service';
import { createLogger } from '../../../infrastructure/logger/logger';

const logger = createLogger('notification-consumer');

export async function startNotificationKafkaConsumer(signal: AbortSignal): Promise<void> {
  const stop = await runConsumer('notification-consumer-group', [KafkaTopics.PAYMENT_NOTIFICATION], async (msg: EachMessagePayload) => {
    signal.throwIfAborted();
    const raw = msg.message.value?.toString();
    if (!raw) return;
    const parsed = JSON.parse(raw) as { type: string; paymentId?: string };
    await notificationService.dispatch(parsed);
    logger.debug(parsed, 'notification processed');
  });

  await waitForConsumerDisconnect(signal, stop);
}
