import { Prisma, Payment, PaymentStatus } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma/prisma';

export class PaymentRepository {
  async findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { id } });
  }

  async findByIdForUpdate(tx: Prisma.TransactionClient, id: string): Promise<Payment | null> {
    await tx.$executeRaw`SELECT id FROM payments WHERE id = ${id}::uuid FOR UPDATE`;
    return tx.payment.findUnique({ where: { id } });
  }

  async create(
    tx: Prisma.TransactionClient,
    data: {
      amount: Prisma.Decimal;
      currency: string;
      status: PaymentStatus;
      metadata?: Record<string, unknown> | null;
      correlationId?: string | null;
      id?: string;
    },
  ): Promise<Payment> {
    return tx.payment.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        ...(data.metadata !== undefined
          ? {
              metadata:
                data.metadata === null ? Prisma.JsonNull : (data.metadata as Prisma.InputJsonValue),
            }
          : {}),
        ...(data.correlationId !== undefined ? { correlationId: data.correlationId ?? null } : {}),
      },
    });
  }

  async updateStatus(
    tx: Prisma.TransactionClient | typeof prisma,
    id: string,
    fromVersion: number,
    patch: Partial<Pick<Payment, 'status' | 'gatewayRef' | 'failureReason' | 'retryCount'>>,
  ): Promise<Payment> {
    const client = tx;
    const nextVersion = fromVersion + 1;
    const data: Prisma.PaymentUpdateManyMutationInput = {
      version: nextVersion,
    };
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.gatewayRef !== undefined) data.gatewayRef = patch.gatewayRef;
    if (patch.failureReason !== undefined) data.failureReason = patch.failureReason;
    if (patch.retryCount !== undefined) data.retryCount = patch.retryCount;

    const result = await client.payment.updateMany({
      where: { id, version: fromVersion },
      data,
    });
    if (result.count === 0) {
      throw new Error('optimistic_lock_conflict');
    }
    return client.payment.findUniqueOrThrow({ where: { id } });
  }

  async updateStatusSimple(
    id: string,
    status: PaymentStatus,
    extra?: Partial<Pick<Payment, 'gatewayRef' | 'failureReason' | 'retryCount'>>,
  ): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: { status, ...extra },
    });
  }
}

export const paymentRepository = new PaymentRepository();
