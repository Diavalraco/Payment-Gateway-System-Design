import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma/prisma';

export class PaymentEventRepository {
  append(
    tx: Prisma.TransactionClient | typeof prisma,
    paymentId: string,
    type: string,
    payload: Prisma.InputJsonValue,
  ) {
    return tx.paymentEvent.create({
      data: { paymentId, type, payload },
    });
  }

  listForPayment(paymentId: string) {
    return prisma.paymentEvent.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const paymentEventRepository = new PaymentEventRepository();
