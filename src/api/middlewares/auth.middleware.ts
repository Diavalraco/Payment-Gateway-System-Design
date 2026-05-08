import { Request, Response, NextFunction } from 'express';
import { loadEnv } from '../../infrastructure/config/env';
import { UnauthorizedError } from '../../common/exceptions/appError';

/** Optional shared secret via `API_TOKEN`; when unset all requests proceed. */
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = loadEnv().API_TOKEN;
  if (!token) {
    return next();
  }
  if (req.header('x-api-token') !== token) {
    return next(new UnauthorizedError());
  }
  return next();
}
