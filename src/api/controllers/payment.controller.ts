import { PaymentEvent } from '@prisma/client';
import { Request, Response } from 'express';
import { createPaymentBodySchema } from '../validators/payment.validator';
import { paymentService } from '../../modules/payment/services/payment.service';
import { setCachedResponse } from '../../infrastructure/redis/idempotencyCache.service';

function paramString(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export class PaymentController {
  /** POST /payments */
  async create(req: Request, res: Response) {
    const body = createPaymentBodySchema.parse(req.body);
    const locals = res.locals as { idempotencyKey?: string };
    const idempotencyKey = locals.idempotencyKey;
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Idempotency-Key missing' });
    }

    const { body: snapshot, statusCode } = await paymentService.createPayment(body, {
      idempotencyKey,
      correlationId: req.correlationId,
    });

    await setCachedResponse(idempotencyKey, snapshot, statusCode);

    res.setHeader('Idempotency-Key', idempotencyKey);
    res.setHeader('x-correlation-id', req.correlationId);
    return res.status(statusCode).json(snapshot);
  }

  async get(req: Request, res: Response) {
    const id = paramString(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const payment = await paymentService.getPayment(id);
    res.setHeader('x-correlation-id', req.correlationId);
    return res.status(200).json(payment);
  }

  async events(req: Request, res: Response) {
    const id = paramString(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const rows = await paymentService.listEvents(id);
    const mapped = rows.map((e: PaymentEvent) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    }));
    res.setHeader('x-correlation-id', req.correlationId);
    return res.status(200).json({ events: mapped });
  }
}

export const paymentController = new PaymentController();
