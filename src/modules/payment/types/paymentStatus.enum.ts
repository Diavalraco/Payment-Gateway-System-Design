import { PaymentStatus as PrismaStatus } from '@prisma/client';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export function toDomainStatus(s: PrismaStatus): PaymentStatus {
  return s as PaymentStatus;
}

export const STATUS_PRECEDENCE: Record<PaymentStatus, number> = {
  SUCCESS: 4,
  FAILED: 3,
  PROCESSING: 2,
  PENDING: 1,
};
