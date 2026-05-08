import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../../common/exceptions/appError';
import { HttpHeaders } from '../../common/constants/headers';
import { getCachedResponse, setCachedResponse } from '../../infrastructure/redis/idempotencyCache.service';
import { idempotencyRepository } from '../../modules/payment/repositories/idempotency.repository';

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.header(HttpHeaders.IDEMPOTENCY_KEY);
  if (!key || key.trim().length === 0) {
    return next(new ValidationError('Idempotency-Key header required'));
  }

  const normalized = key.trim();

  void (async () => {
    try {
      const redisHit = await getCachedResponse(normalized);
      if (redisHit) {
        res.status(redisHit.statusCode).type('application/json').send(redisHit.body);
        return;
      }

      const row = await idempotencyRepository.findByKey(normalized);
      if (row) {
        const body = row.responseBody as Record<string, unknown>;
        await setCachedResponse(normalized, body, row.statusCode);
        res.status(row.statusCode).json(body);
        return;
      }

      const locals = res.locals as { idempotencyKey?: string };
      locals.idempotencyKey = normalized;
      next();
    } catch (err) {
      next(err);
    }
  })();
}
