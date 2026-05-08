import { Payment } from '@prisma/client';
import { decimalToString } from '../types/payment.types';
import { PaymentStatus, toDomainStatus } from '../types/paymentStatus.enum';

export function toPaymentResponse(p: Payment, opts?: { idempotencyKey?: string }) {
  return {
    id: p.id,
    amount: decimalToString(p.amount),
    currency: p.currency,
    status: toDomainStatus(p.status) as PaymentStatus,
    metadata: (p.metadata as Record<string, unknown> | undefined) ?? null,
    correlationId: p.correlationId,
    gatewayRef: p.gatewayRef,
    failureReason: p.failureReason,
    retryCount: p.retryCount,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    ...(opts?.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : {}),
  };
}
