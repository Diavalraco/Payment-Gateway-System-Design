import { PaymentStatus } from '@prisma/client';
import { STATUS_PRECEDENCE } from '../../payment/types/paymentStatus.enum';

export class WebhookConflictService {
  shouldApply(current: PaymentStatus, incoming: PaymentStatus): boolean {
    const order = STATUS_PRECEDENCE as Record<string, number>;
    return order[incoming] >= order[current];
  }
}

export const webhookConflictService = new WebhookConflictService();
