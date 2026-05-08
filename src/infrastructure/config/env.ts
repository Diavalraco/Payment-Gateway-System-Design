import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  MAX_RETRY_ATTEMPTS: z.coerce.number().default(5),
  RETRY_BASE_DELAY_MS: z.coerce.number().default(2000),
  PAYMENT_TIMEOUT_MS: z.coerce.number().default(15000),
  WEBHOOK_SECRET: z.string().min(1),
  GATEWAY_SUCCESS_RATE: z.coerce.number().min(0).max(1).default(0.6),
  GATEWAY_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.25),
  GATEWAY_TIMEOUT_RATE: z.coerce.number().min(0).max(1).default(0.15),
  PAYMENT_LOCK_TTL_MS: z.coerce.number().default(30000),
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce.number().default(30000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  OUTBOX_POLL_MS: z.coerce.number().default(500),
  RETRY_POLL_MS: z.coerce.number().default(1000),
  SERVICE_NAME: z.string().default('payment-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  API_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  cached = parsed.data;
  return parsed.data;
}

export function resetEnvCache(): void {
  cached = null;
}
