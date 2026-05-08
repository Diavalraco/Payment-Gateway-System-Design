import { Router } from 'express';
import { correlationIdMiddleware } from '../middlewares/correlationId.middleware';
import { rateLimiterMiddleware } from '../middlewares/rateLimiter.middleware';
import { webhookController } from '../controllers/webhook.controller';
import { routeAsync } from '../../common/helpers/asyncRoute';

const router = Router();

router.post('/webhooks/payment-status', correlationIdMiddleware, rateLimiterMiddleware, routeAsync((req, res) =>
  webhookController.handleGatewayCallback(req, res),
));

export { router as webhookRouter };
