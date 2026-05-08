import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma/prisma';

export class IdempotencyRepository {
  findByKey(key: string) {
    return prisma.idempotencyKey.findUnique({
      where: { key },
      include: { payment: true },
    });
  }

  create(tx: Prisma.TransactionClient, data: {
    key: string;
    paymentId: string;
    responseBody: unknown;
    statusCode: number;
    path?: string;
    method?: string;
  }) {
    return tx.idempotencyKey.create({
      data: {
        key: data.key,
        paymentId: data.paymentId,
        responseBody: data.responseBody as Prisma.InputJsonValue,
        statusCode: data.statusCode,
        path: data.path ?? '/payments',
        method: data.method ?? 'POST',
      },
    });
  }
}

export const idempotencyRepository = new IdempotencyRepository();
