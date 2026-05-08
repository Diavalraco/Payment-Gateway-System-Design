import { paymentStateMachine } from '../../modules/payment/services/paymentStateMachine.service';

describe('PaymentStateMachineService', () => {
  const sm = paymentStateMachine;

  it('allows PENDING -> PROCESSING', () => {
    expect(() => sm.assertTransition('PENDING', 'PROCESSING')).not.toThrow();
  });

  it('rejects PROCESSING -> PENDING', () => {
    expect(() => sm.assertTransition('PROCESSING', 'PENDING')).toThrow();
  });

  it('allows PROCESSING -> SUCCESS', () => {
    expect(() => sm.assertTransition('PROCESSING', 'SUCCESS')).not.toThrow();
  });

  it('detects terminals', () => {
    expect(sm.isTerminal('SUCCESS')).toBe(true);
    expect(sm.isTerminal('PENDING')).toBe(false);
  });

  it('allows webhook terminal from PROCESSING only', () => {
    expect(() => sm.assertWebhookTerminal('PROCESSING', 'SUCCESS')).not.toThrow();
    expect(() => sm.assertWebhookTerminal('SUCCESS', 'FAILED')).toThrow();
  });
});
