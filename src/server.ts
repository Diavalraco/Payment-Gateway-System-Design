import { createApp } from './app';
import { bootstrapInfrastructure, shutdownInfrastructure } from './bootstrap';
import { getAppConfig } from './infrastructure/config/app.config';
import { createLogger } from './infrastructure/logger/logger';

const logger = createLogger('server');

async function main() {
  await bootstrapInfrastructure();
  const cfg = getAppConfig();
  const app = createApp();

  const server = app.listen(cfg.port, () => {
    logger.info({ port: cfg.port }, `HTTP listening on :${cfg.port}`);
  });

  const shutdown = async () => {
    logger.warn({ msg: 'shutting down' });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await shutdownInfrastructure();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

void main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  await shutdownInfrastructure().catch(() => undefined);
  process.exit(1);
});
