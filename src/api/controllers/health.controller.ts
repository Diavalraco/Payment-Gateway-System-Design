import { Request, Response } from 'express';
import { getDbConfig } from '../../infrastructure/config/db.config';
import { getRedisConfig } from '../../infrastructure/config/redis.config';
import { prisma } from '../../infrastructure/database/prisma/prisma';
import { getRedis } from '../../infrastructure/redis/redis.client';

export class HealthController {
  /** GET /health */
  async liveness(req: Request, res: Response) {
    await prisma.$queryRaw`SELECT 1`;
    await getRedis().ping();

    const payload = {
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
      postgres: {},
      redis: getRedisConfig(),
      dbHost: sanitizeHost(getDbConfig().url),
    };

    res.setHeader('x-correlation-id', req.correlationId);
    res.status(200).json(payload);
  }
}

function sanitizeHost(databaseUrl: string) {
  try {
    const u = new URL(databaseUrl);
    u.password = '***';
    return u.hostname;
  } catch {
    return 'unknown';
  }
}

export const healthController = new HealthController();
