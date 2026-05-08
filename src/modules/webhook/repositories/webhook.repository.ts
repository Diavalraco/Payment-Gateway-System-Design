import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma/prisma';

export class WebhookRepository {
  findByExternalId(externalId: string) {
    return prisma.webhookEvent.findUnique({
      where: { externalId },
    });
  }

  insert(tx: Prisma.TransactionClient, data: {
    externalId: string;
    paymentId: string;
    payload: Prisma.InputJsonValue;
  }) {
    return tx.webhookEvent.create({
      data: {
        externalId: data.externalId,
        paymentId: data.paymentId,
        payload: data.payload,
      },
    });
  }

  async markProcessed(id: string) {
    await prisma.webhookEvent.updateMany({ where: { id }, data: { processed: true } });
  }
}

export const webhookRepository = new WebhookRepository();
