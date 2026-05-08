import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { HttpHeaders } from '../../common/constants/headers';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId: string;
  }
}

export function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.correlationId = req.header(HttpHeaders.CORRELATION_ID) ?? randomUUID();
  next();
}
