export const paymentInitiatedPayload = (p: { id: string; amount: string; currency: string }) => ({
  paymentId: p.id,
  amount: p.amount,
  currency: p.currency,
  at: new Date().toISOString(),
});

export type PaymentInitiatedPayload = ReturnType<typeof paymentInitiatedPayload>;
