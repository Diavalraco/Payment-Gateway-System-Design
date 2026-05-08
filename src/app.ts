import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { paymentRouter } from './api/routes/payment.routes';
import { webhookRouter } from './api/routes/webhook.routes';
import { healthRouter } from './api/routes/health.routes';

import { errorMiddleware } from './api/middlewares/error.middleware';
import { requestLoggerMiddleware } from './api/middlewares/requestLogger.middleware';
import { openApiDocument } from './api/openapi/openapi.document';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ exposedHeaders: ['x-correlation-id', 'Idempotency-Key', 'x-request-id'] }));

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    }),
  );

  app.use(requestLoggerMiddleware);

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(paymentRouter);
  app.use(webhookRouter);
  app.use(healthRouter);

  app.use(errorMiddleware);

  return app;
}
