export const paymentSuccessPayload = (paymentId: string, gatewayRef?: string | null) => ({
  paymentId,
  gatewayRef: gatewayRef ?? null,
  at: new Date().toISOString(),
});

export type PaymentSuccessPayload = ReturnType<typeof paymentSuccessPayload>;
