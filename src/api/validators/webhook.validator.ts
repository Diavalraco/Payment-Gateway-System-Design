import { z } from 'zod';

export const webhookStatusSchema = z.object({
  eventId: z.string().min(1),
  paymentId: z.string().uuid(),
  status: z.enum(['SUCCESS', 'FAILED']),
  gatewayRef: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export type WebhookStatusDto = z.infer<typeof webhookStatusSchema>;
