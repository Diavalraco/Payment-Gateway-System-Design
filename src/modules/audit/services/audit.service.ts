import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma/prisma';

export class AuditService {
  async persistFromEvent(params: {
    correlationId?: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }) {
    await prisma.auditLog.create({
      data: {
        correlationId: params.correlationId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload as Prisma.InputJsonValue,
      },
    });
  }
}

export const auditService = new AuditService();
