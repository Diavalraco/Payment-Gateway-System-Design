/** HTTP headers used throughout the gateway surface */
export const HttpHeaders = {
  IDEMPOTENCY_KEY: 'idempotency-key',
  CORRELATION_ID: 'x-correlation-id',
  PAYMENT_SIGNATURE: 'x-payment-signature',
  API_TOKEN: 'x-api-token',
} as const;
