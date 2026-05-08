import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma/prisma';
import { KafkaTopics } from '../../../infrastructure/kafka/kafka.topics';
import { AppError } from '../../../common/exceptions/appError';
import { paymentRepository, PaymentRepository } from '../repositories/payment.repository';
import { paymentEventRepository, PaymentEventRepository } from '../repositories/paymentEvent.repository';
import { idempotencyRepository, IdempotencyRepository } from '../repositories/idempotency.repository';
import { outboxRepository, OutboxRepository } from '../../outbox/repositories/outbox.repository';
import { toPaymentResponse } from '../dto/paymentResponse.dto';
import { CreatePaymentDto } from '../dto/createPayment.dto';
import { paymentInitiatedPayload } from '../events/paymentInitiated.event';

export class PaymentService {
  constructor(
    private readonly payments: PaymentRepository = paymentRepository,
    private readonly events: PaymentEventRepository = paymentEventRepository,
    private readonly idem: IdempotencyRepository = idempotencyRepository,
    private readonly outbox: OutboxRepository = outboxRepository,
  ) {}

  async createPayment(
    input: CreatePaymentDto,
    opts: { idempotencyKey: string; correlationId?: string },
  ): Promise<{ body: Record<string, unknown>; statusCode: number }> {
    const amount = new Decimal(input.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new AppError('Amount must be positive', 422, 'INVALID_AMOUNT');
    }

    const correlationId = opts.correlationId;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await this.payments.create(tx, {
        amount,
        currency: input.currency,
        status: 'PENDING',
        metadata: input.metadata,
        correlationId,
      });

      await this.events.append(tx, payment.id, 'payment.initiated', {
        correlationId,
        amount: payment.amount.toString(),
        currency: payment.currency,
      });

      await this.outbox.enqueue(tx, {
        aggregateId: payment.id,
        topic: KafkaTopics.PAYMENT_INITIATED,
        payload: paymentInitiatedPayload({
          id: payment.id,
          amount: payment.amount.toString(),
          currency: payment.currency,
        }),
        headers: correlationId ? { 'correlation-id': correlationId } : undefined,
      });

      const bodySnapshot = {
        ...toPaymentResponse(payment),
      };

      await this.idem.create(tx, {
        key: opts.idempotencyKey,
        paymentId: payment.id,
        responseBody: bodySnapshot as unknown as Prisma.InputJsonValue,
        statusCode: 201,
      });
    });

    const full = await this.idem.findByKey(opts.idempotencyKey);
    if (!full?.payment) {
      throw new AppError('Idempotency record missing after create', 500, 'INTERNAL');
    }

    const body = {
      ...toPaymentResponse(full.payment),
    };

    return { body, statusCode: 201 };
  }

  async getPayment(id: string) {
    const p = await this.payments.findById(id);
    if (!p) throw new AppError('Payment not found', 404, 'NOT_FOUND');
    return toPaymentResponse(p);
  }

  async listEvents(paymentId: string) {
    const p = await this.payments.findById(paymentId);
    if (!p) throw new AppError('Payment not found', 404, 'NOT_FOUND');
    return this.events.listForPayment(paymentId);
  }

  replayIdempotentResponse(storedBody: Record<string, unknown>, statusCode: number) {
    return { body: storedBody, statusCode };
  }
}

export const paymentService = new PaymentService();
