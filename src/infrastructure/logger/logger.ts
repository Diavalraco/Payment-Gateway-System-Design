import pino from 'pino';

export function createLogger(name: string): pino.Logger {
  const env = process.env.NODE_ENV ?? 'development';
  return pino({
    name,
    level: env === 'production' ? 'info' : env === 'test' ? 'silent' : 'debug',
    redact: ['req.headers.authorization'],
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}
