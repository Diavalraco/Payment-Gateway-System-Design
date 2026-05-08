import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '../../../infrastructure/database/prisma/prisma';
import { Prisma } from '@prisma/client';
import { webhookRepository } from '../repositories/webhook.repository';
import { webhookConflictService } from './webhookConflict.service';
import { paymentStateMachine } from '../../payment/services/paymentStateMachine.service';
import { paymentRepository } from '../../payment/repositories/payment.repository';
import { paymentEventRepository } from '../../payment/repositories/paymentEvent.repository';
import { outboxRepository } from '../../outbox/repositories/outbox.repository';
import { KafkaTopics } from '../../../infrastructure/kafka/kafka.topics';
import { loadEnv } from '../../../infrastructure/config/env';
import { AppError } from '../../../common/exceptions/appError';

export interface WebhookStatusPayload {
  eventId: string;
  paymentId: string;
  status: 'SUCCESS' | 'FAILED';
  gatewayRef?: string | null;
  reason?: string | null;
  rawPayload: Record<string, unknown>;
}

export class WebhookService {
  verifySignature(rawBody: string, signatureHeader?: string): void {
    const secret = loadEnv().WEBHOOK_SECRET;
    const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = signatureHeader?.replace(/^sha256=/i, '').trim();
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const providedBuf = Buffer.from(provided ?? '', 'hex');
    if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
      throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
    }
  }

  async handleStructured(payload: WebhookStatusPayload) {
    if (await webhookRepository.findByExternalId(payload.eventId)) {
      return { duplicate: true, paymentId: payload.paymentId };
    }

    const paymentIdReturned = payload.paymentId;
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const webhookRow = await webhookRepository.insert(tx, {
        externalId: payload.eventId,
        paymentId: payload.paymentId,
        payload: { ...payload.rawPayload, canonical: payload } as unknown as Prisma.InputJsonValue,
      });

      const payment = await tx.payment.findUnique({ where: { id: payload.paymentId } });
      if (!payment || !webhookConflictService.shouldApply(payment.status, payload.status)) {
        await tx.webhookEvent.update({
          where: { id: webhookRow.id },
          data: { processed: true },
        });
        return;
      }

      if (paymentStateMachine.isTerminal(payment.status)) {
        await tx.webhookEvent.update({
          where: { id: webhookRow.id },
          data: { processed: true },
        });
        return;
      }

      paymentStateMachine.assertWebhookTerminal(payment.status, payload.status);

      await paymentRepository.updateStatus(
        tx,
        payment.id,
        payment.version,
        {
          status: payload.status,
          gatewayRef: payload.gatewayRef ?? payment.gatewayRef,
          failureReason: payload.status === 'FAILED' ? (payload.reason ?? 'webhook_failed') : null,
        },
      );

      await paymentEventRepository.append(tx, payment.id, `webhook.${payload.status.toLowerCase()}`, {
        eventId: payload.eventId,
        gatewayRef: payload.gatewayRef,
      });

      if (payload.status === 'SUCCESS') {
        await outboxRepository.enqueue(tx, {
          aggregateId: payment.id,
          topic: KafkaTopics.PAYMENT_SUCCESS,
          payload: {
            paymentId: payment.id,
            source: 'webhook',
          },
        });
        await outboxRepository.enqueue(tx, {
          aggregateId: payment.id,
          topic: KafkaTopics.PAYMENT_NOTIFICATION,
          payload: { type: 'payment.success', paymentId: payment.id },
        });
      } else {
        await outboxRepository.enqueue(tx, {
          aggregateId: payment.id,
          topic: KafkaTopics.PAYMENT_FAILED,
          payload: {
            paymentId: payment.id,
            source: 'webhook',
            reason: payload.reason,
          },
        });
      }

      await outboxRepository.enqueue(tx, {
        aggregateId: payment.id,
        topic: KafkaTopics.PAYMENT_AUDIT,
        payload: {
          action: 'webhook_processed',
          paymentId: payment.id,
          externalId: payload.eventId,
        },
      });

      await tx.webhookEvent.update({
        where: { id: webhookRow.id },
        data: { processed: true },
      });
    });

    return { duplicate: false, paymentId: paymentIdReturned };
  }
}

export const webhookService = new WebhookService();
