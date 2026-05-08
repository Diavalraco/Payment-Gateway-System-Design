import { Decimal } from '@prisma/client/runtime/library';
import { PaymentStatus } from './paymentStatus.enum';

export interface PaymentView {
  id: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown> | null;
  correlationId?: string | null;
  gatewayRef?: string | null;
  failureReason?: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function decimalToString(d: Decimal): string {
  return d.toString();
}
