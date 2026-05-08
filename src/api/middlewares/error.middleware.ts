import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../common/exceptions/appError';
import { createLogger } from '../../infrastructure/logger/logger';

const logger = createLogger('error-middleware');

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  logger.error({ err, path: req.path }, 'unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
}
