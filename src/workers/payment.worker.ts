import { EachMessagePayload } from 'kafkajs';
import { prisma } from '../infrastructure/database/prisma/prisma';
import { runConsumer, waitForConsumerDisconnect } from '../infrastructure/kafka/kafka.consumer';
import { KafkaTopics } from '../infrastructure/kafka/kafka.topics';
import { createLogger } from '../infrastructure/logger/logger';
import { paymentLockService } from '../modules/payment/services/paymentLock.service';
import { paymentRepository } from '../modules/payment/repositories/payment.repository';
import { paymentEventRepository } from '../modules/payment/repositories/paymentEvent.repository';
import { outboxRepository } from '../modules/outbox/repositories/outbox.repository';
import { mockGatewayAdapter } from '../modules/gateway/adapters/mockGateway.adapter';
import { GatewayError } from '../common/exceptions/appError';
import { retryScheduler } from '../modules/retry/services/retryScheduler.service';
import { paymentRetryService } from '../modules/payment/services/paymentRetry.service';
import { paymentSuccessCounter, paymentFailedCounter } from '../infrastructure/monitoring/metrics';

const logger = createLogger('payment-worker');

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export interface InitiatedPayload {
  paymentId: string;
  amount?: string;
  currency?: string;
}

export async function handlePaymentInitiated(payload: InitiatedPayload): Promise<void> {
  const paymentId = payload.paymentId;

  let lock = null as Awaited<ReturnType<typeof paymentLockService.tryLockPayment>>;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    lock = await paymentLockService.tryLockPayment(paymentId);
    if (lock) break;
    await sleep(200 + Math.random() * 400);
  }
  if (!lock) {
    throw new Error(`lock_contention:${paymentId}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await paymentRepository.findByIdForUpdate(tx, paymentId);
      if (!locked) return;
      if (locked.status === 'SUCCESS' || locked.status === 'FAILED') return;

      if (locked.status === 'PENDING') {
        await paymentRepository.updateStatus(tx, locked.id, locked.version, {
          status: 'PROCESSING',
        });
        await paymentEventRepository.append(tx, locked.id, 'payment.processing', {
          at: new Date().toISOString(),
        });
        await outboxRepository.enqueue(tx, {
          aggregateId: locked.id,
          topic: KafkaTopics.PAYMENT_PROCESSING,
          payload: { paymentId: locked.id },
        });
      }
    });

    const beforeGateway = await paymentRepository.findById(paymentId);
    if (!beforeGateway || beforeGateway.status !== 'PROCESSING') {
      return;
    }

    const gatewayResult = await mockGatewayAdapter.charge(paymentId);

    if (gatewayResult.success) {
      const updated = await prisma.$transaction(async (tx) => {
        const locked = await paymentRepository.findByIdForUpdate(tx, paymentId);
        if (!locked || locked.status !== 'PROCESSING') {
          return false;
        }
        await paymentRepository.updateStatus(tx, locked.id, locked.version, {
          status: 'SUCCESS',
          gatewayRef: gatewayResult.gatewayTxnId ?? locked.gatewayRef,
          failureReason: null,
        });
        await paymentEventRepository.append(tx, locked.id, 'payment.success', {
          gatewayRef: gatewayResult.gatewayTxnId,
          duplicateWebhookScenario: gatewayResult.duplicateWebhook ?? false,
        });
        await outboxRepository.enqueue(tx, {
          aggregateId: locked.id,
          topic: KafkaTopics.PAYMENT_SUCCESS,
          payload: {
            paymentId: locked.id,
            source: 'worker',
            duplicateWebhook: gatewayResult.duplicateWebhook ?? false,
          },
        });
        await outboxRepository.enqueue(tx, {
          aggregateId: locked.id,
          topic: KafkaTopics.PAYMENT_NOTIFICATION,
          payload: { type: 'payment.success', paymentId: locked.id },
        });
        await outboxRepository.enqueue(tx, {
          aggregateId: locked.id,
          topic: KafkaTopics.PAYMENT_AUDIT,
          payload: { action: 'payment_success', paymentId: locked.id },
        });
        return true;
      });
      if (updated) {
        paymentSuccessCounter.inc();
      }
      return;
    }

    await handleGatewayFailure(gatewayResult.error, paymentId);
    paymentFailedCounter.inc();
  } finally {
    await lock.release();
  }
}

async function handleGatewayFailure(err: GatewayError | undefined, paymentId: string) {
  const reason = err?.message ?? 'gateway_error';
  const transient = err?.transient ?? true;

  if (!transient) {
    await markPermanentFailureDbOnly(paymentId, reason);
    return;
  }

  await prisma.payment.updateMany({
    where: { id: paymentId },
    data: {
      retryCount: { increment: 1 },
    },
  });

  const payment = await paymentRepository.findById(paymentId);
  const attempt = payment?.retryCount ?? 0;

  if (attempt >= paymentRetryService.maxAttempts()) {
    await prisma.$transaction(async (tx) => {
      const locked = await paymentRepository.findByIdForUpdate(tx, paymentId);
      if (!locked) return;
      if (locked.status !== 'PROCESSING') return;
      await paymentRepository.updateStatus(tx, locked.id, locked.version, {
        status: 'FAILED',
        failureReason: `max_retries:${reason}`,
      });
      await paymentEventRepository.append(tx, locked.id, 'payment.failed', {
        dlqCandidate: true,
      });
      await outboxRepository.enqueue(tx, {
        aggregateId: locked.id,
        topic: KafkaTopics.PAYMENT_FAILED,
        payload: { paymentId: locked.id, reason },
      });
    });

    await paymentRetryService.sendToDlq({
      paymentId,
      retryCount: attempt,
      failureReason: reason,
      failedAt: new Date().toISOString(),
    });
    return;
  }

  await retryScheduler.scheduleRetry({
    paymentId,
    retryCount: attempt,
    reason,
  });
}

async function markPermanentFailureDbOnly(paymentId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const locked = await paymentRepository.findByIdForUpdate(tx, paymentId);
    if (!locked) return;
    if (locked.status !== 'PROCESSING') return;
    await paymentRepository.updateStatus(tx, locked.id, locked.version, {
      status: 'FAILED',
      failureReason: reason,
    });
    await paymentEventRepository.append(tx, locked.id, 'payment.failed', { reason });
    await outboxRepository.enqueue(tx, {
      aggregateId: locked.id,
      topic: KafkaTopics.PAYMENT_FAILED,
      payload: { paymentId: locked.id, reason },
    });
  });
}

export async function startPaymentWorker(signal: AbortSignal): Promise<void> {
  logger.info({ msg: 'payment worker subscribing' });
  const stop = await runConsumer(
    'payment-worker-group',
    [KafkaTopics.PAYMENT_INITIATED],
    async (payload: EachMessagePayload) => {
      signal.throwIfAborted();
      const raw = payload.message.value?.toString();
      if (!raw) return;
      const parsed = JSON.parse(raw) as InitiatedPayload;
      signal.throwIfAborted();
      await handlePaymentInitiated(parsed);
    },
  );

  await waitForConsumerDisconnect(signal, stop);
}
