process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://payment:payment@localhost:5432/payments?schema=public';
// Host-run Jest hitting Docker Compose must use the same secret as the app container (docker-compose.yml).
if (process.env.INTEGRATION_TESTS === '1') {
  process.env.WEBHOOK_SECRET =
    process.env.WEBHOOK_SECRET || 'dev-webhook-secret-change-me';
} else {
  process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-webhook-secret';
}
process.env.KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'payment-api-test';
