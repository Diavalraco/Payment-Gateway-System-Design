export const paymentFailedPayload = (paymentId: string, reason: string, retryable: boolean) => ({
  paymentId,
  reason,
  retryable,
  at: new Date().toISOString(),
});

export type PaymentFailedPayload = ReturnType<typeof paymentFailedPayload>;
