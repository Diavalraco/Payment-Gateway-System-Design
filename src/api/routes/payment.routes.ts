import { Router } from 'express';
import { correlationIdMiddleware } from '../middlewares/correlationId.middleware';
import { rateLimiterMiddleware } from '../middlewares/rateLimiter.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware';
import { paymentController } from '../controllers/payment.controller';
import { routeAsync } from '../../common/helpers/asyncRoute';

const router = Router();

router.use(correlationIdMiddleware, authMiddleware);

router.post(
  '/payments',
  rateLimiterMiddleware,
  idempotencyMiddleware,
  routeAsync((req, res) => paymentController.create(req, res)),
);

router.get('/payments/:id', routeAsync((req, res) => paymentController.get(req, res)));

router.get('/payments/:id/events', routeAsync((req, res) => paymentController.events(req, res)));

export { router as paymentRouter };
