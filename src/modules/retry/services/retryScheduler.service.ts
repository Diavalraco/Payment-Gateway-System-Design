import { prisma } from '../../../infrastructure/database/prisma/prisma';
import { exponentialBackoff } from './exponentialBackoff.service';
import { KafkaTopics } from '../../../infrastructure/kafka/kafka.topics';
import { createLogger } from '../../../infrastructure/logger/logger';
import { outboxRepository } from '../../outbox/repositories/outbox.repository';

const logger = createLogger('retry-scheduler');

export class RetrySchedulerService {
  async scheduleRetry(params: {
    paymentId: string;
    retryCount: number;
    reason?: string;
  }): Promise<void> {
    const executeAt = exponentialBackoff.computeExecuteAt(params.retryCount);
    await prisma.$transaction(async (tx) => {
      const row = await tx.retryEvent.create({
        data: {
          paymentId: params.paymentId,
          retryCount: params.retryCount,
          executeAt,
          reason: params.reason,
        },
      });
      const payloadMsg = {
        paymentId: params.paymentId,
        retryCount: params.retryCount,
        reason: params.reason,
        executeAt: executeAt.toISOString(),
        retryRecordId: row.id,
      };
      logger.info(payloadMsg, 'scheduling retry');
      await outboxRepository.enqueue(tx, {
        aggregateId: params.paymentId,
        topic: KafkaTopics.PAYMENT_RETRY,
        payload: payloadMsg,
      });
    });
  }
}

export const retryScheduler = new RetrySchedulerService();
