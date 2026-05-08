import { loadEnv } from '../../../infrastructure/config/env';
import { publishMessage } from '../../../infrastructure/kafka/kafka.producer';
import { KafkaTopics } from '../../../infrastructure/kafka/kafka.topics';
import { dlqMessagesCounter } from '../../../infrastructure/monitoring/metrics';
import { createLogger } from '../../../infrastructure/logger/logger';

const logger = createLogger('payment-retry');

export class PaymentRetryService {
  maxAttempts(): number {
    return loadEnv().MAX_RETRY_ATTEMPTS;
  }

  async sendToDlq(payload: {
    paymentId: string;
    retryCount: number;
    failureReason: string;
    failedAt: string;
  }): Promise<void> {
    dlqMessagesCounter.inc();
    logger.error(payload, 'DLQ');
    await publishMessage({
      topic: KafkaTopics.PAYMENT_DLQ,
      messages: [{ key: payload.paymentId, value: JSON.stringify(payload) }],
    });
  }
}

export const paymentRetryService = new PaymentRetryService();
