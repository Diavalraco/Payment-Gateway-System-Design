import { Router } from 'express';
import { correlationIdMiddleware } from '../middlewares/correlationId.middleware';
import { healthController } from '../controllers/health.controller';
import { registry } from '../../infrastructure/monitoring/metrics';
import { routeAsync } from '../../common/helpers/asyncRoute';

const router = Router();

router.get('/health', correlationIdMiddleware, routeAsync((req, res) => healthController.liveness(req, res)));

router.get('/metrics', routeAsync(async (_req, res) => {
  res.setHeader('Content-Type', registry.contentType);
  res.send(await registry.metrics());
}));

export { router as healthRouter };
