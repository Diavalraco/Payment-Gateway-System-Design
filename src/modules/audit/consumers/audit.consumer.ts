import { EachMessagePayload } from 'kafkajs';
import { runConsumer, waitForConsumerDisconnect } from '../../../infrastructure/kafka/kafka.consumer';
import { KafkaTopics } from '../../../infrastructure/kafka/kafka.topics';
import { auditService } from '../services/audit.service';
import { createLogger } from '../../../infrastructure/logger/logger';

const logger = createLogger('audit-consumer');

export async function startAuditKafkaConsumer(signal: AbortSignal): Promise<void> {
  const stop = await runConsumer('audit-consumer-group', [KafkaTopics.PAYMENT_AUDIT], async (msg: EachMessagePayload) => {
    signal.throwIfAborted();
    const raw = msg.message.value?.toString();
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      action?: string;
      paymentId?: string;
      correlationId?: string;
    };
    const paymentId = parsed.paymentId ?? '';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(paymentId)) {
      logger.warn({ parsed }, 'audit message missing valid payment UUID; skipping persistence');
      return;
    }

    await auditService.persistFromEvent({
      action: parsed.action ?? 'payment.audit.generic',
      entityType: 'payment',
      entityId: paymentId,
      payload: parsed,
      correlationId: parsed.correlationId,
    });
    logger.debug({ paymentId: parsed.paymentId }, 'audit persisted');
  });

  await waitForConsumerDisconnect(signal, stop);
}
