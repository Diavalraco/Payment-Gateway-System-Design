import { z } from 'zod';

export const createPaymentBodySchema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'amount must be positive decimal'),
  currency: z.string().length(3).toUpperCase(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreatePaymentDto = z.infer<typeof createPaymentBodySchema>;
