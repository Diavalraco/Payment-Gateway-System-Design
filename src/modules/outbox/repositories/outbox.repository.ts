import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma/prisma';

export class OutboxRepository {
  enqueue(
    tx: Prisma.TransactionClient,
    params: {
      aggregateId: string;
      topic: string;
      payload: Prisma.InputJsonValue;
      headers?: Record<string, string>;
    },
  ) {
    return tx.outbox.create({
      data: {
        aggregateId: params.aggregateId,
        topic: params.topic,
        payload: params.payload,
        headers: params.headers as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async claimBatch(limit: number) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.outbox.findMany({
        where: { published: false },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });
      return rows;
    });
  }

  async markPublished(id: string) {
    return prisma.outbox.update({
      where: { id },
      data: { published: true, publishedAt: new Date(), lastError: null },
    });
  }

  async markFailure(id: string, err: string) {
    return prisma.outbox.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError: err.slice(0, 2000) },
    });
  }
}

export const outboxRepository = new OutboxRepository();
