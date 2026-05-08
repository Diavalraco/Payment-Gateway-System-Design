import { Request, Response } from 'express';
import { webhookStatusSchema } from '../validators/webhook.validator';
import { webhookService } from '../../modules/webhook/services/webhook.service';
import { HttpHeaders } from '../../common/constants/headers';

export class WebhookController {
  /** POST /webhooks/payment-status */
  async handleGatewayCallback(req: Request, res: Response) {
    const raw = req.rawBody ?? '';
    webhookService.verifySignature(raw, req.header(HttpHeaders.PAYMENT_SIGNATURE));
    const body = webhookStatusSchema.parse(JSON.parse(raw || '{}'));
    await webhookService.handleStructured({
      eventId: body.eventId,
      paymentId: body.paymentId,
      status: body.status,
      gatewayRef: body.gatewayRef,
      reason: body.reason,
      rawPayload: body as unknown as Record<string, unknown>,
    });
    res.sendStatus(204);
  }
}

export const webhookController = new WebhookController();
