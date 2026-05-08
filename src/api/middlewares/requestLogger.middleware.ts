import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { createLogger } from '../../infrastructure/logger/logger';

const logger = createLogger('http');

export const requestLoggerMiddleware = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const cid = (req as { correlationId?: string }).correlationId ?? randomUUID();
    res.setHeader('x-request-id', cid);
    return cid;
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
