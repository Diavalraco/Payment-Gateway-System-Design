import { PaymentStatus } from '../types/paymentStatus.enum';
import { AppError } from '../../../common/exceptions/appError';

const transitions: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['PROCESSING'],
  PROCESSING: ['SUCCESS', 'FAILED'],
  SUCCESS: [],
  FAILED: [],
};

export class PaymentStateMachineService {
  assertTransition(from: PaymentStatus, to: PaymentStatus): void {
    if (from === to) return;
    const allowed = transitions[from];
    if (!allowed?.includes(to)) {
      throw new AppError(`Invalid payment transition ${from} -> ${to}`, 422, 'INVALID_STATE_TRANSITION');
    }
  }

  isTerminal(status: PaymentStatus): boolean {
    return status === 'SUCCESS' || status === 'FAILED';
  }

  /**
   * Authoritative webhook completion may skip intermediate states handled elsewhere.
   */
  assertWebhookTerminal(from: PaymentStatus, to: 'SUCCESS' | 'FAILED'): void {
    if (this.isTerminal(from)) {
      throw new AppError('Payment already terminal for webhook advancement', 409, 'TERMINAL');
    }
    if (from !== 'PENDING' && from !== 'PROCESSING') {
      throw new AppError(`Invalid webhook base state ${from}`, 422, 'INVALID_WEBHOOK_TRANSITION');
    }
    if (to !== 'SUCCESS' && to !== 'FAILED') {
      throw new AppError('Invalid webhook target', 422, 'INVALID_WEBHOOK_TRANSITION');
    }
  }
}

export const paymentStateMachine = new PaymentStateMachineService();
