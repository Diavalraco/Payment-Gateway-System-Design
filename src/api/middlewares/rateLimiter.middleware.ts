import { NextFunction, Request, Response } from 'express';
import { slidingWindowDefaults } from '../../infrastructure/redis/rateLimiter.service';
import { AppError } from '../../common/exceptions/appError';

export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = `${req.ip}:${req.path}`;
  void slidingWindowDefaults(key)
    .then((result) => {
      if (!result.allowed) {
        res.setHeader('Retry-After', String(Math.ceil((result.retryAfterMs ?? 1000) / 1000)));
        return next(new AppError('Rate limit exceeded', 429, 'RATE_LIMITED'));
      }
      return next();
    })
    .catch(next);
}
