export const KafkaTopics = {
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_PROCESSING: 'payment.processing',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_RETRY: 'payment.retry',
  PAYMENT_DLQ: 'payment.dlq',
  PAYMENT_WEBHOOK: 'payment.webhook',
  PAYMENT_AUDIT: 'payment.audit',
  PAYMENT_NOTIFICATION: 'payment.notification',
  PAYMENT_RETRY_REPLAY: 'payment.retry.replay',
} as const;

export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];

export const ALL_TOPICS: KafkaTopic[] = Object.values(KafkaTopics);
