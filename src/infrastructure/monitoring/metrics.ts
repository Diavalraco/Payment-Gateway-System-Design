import client from 'prom-client';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const paymentSuccessCounter = new client.Counter({
  name: 'payments_success_total',
  help: 'Total successful payments',
  registers: [registry],
});

export const paymentFailedCounter = new client.Counter({
  name: 'payments_failed_total',
  help: 'Total failed payments',
  registers: [registry],
});

export const paymentRetryCounter = new client.Counter({
  name: 'payments_retry_total',
  help: 'Total retry attempts',
  registers: [registry],
});

export const dlqMessagesCounter = new client.Counter({
  name: 'payments_dlq_total',
  help: 'Messages sent to DLQ',
  registers: [registry],
});

export const gatewayLatencyHistogram = new client.Histogram({
  name: 'gateway_latency_ms',
  help: 'Gateway call latency ms',
  buckets: [25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

export const kafkaConsumerLagGauge = new client.Gauge({
  name: 'kafka_consumer_group_lag',
  help: 'Approximated consumer lag (manual updates)',
  labelNames: ['topic', 'group'],
  registers: [registry],
});

export async function metricsHandler(_req: unknown, res: { set: (k: string, v: string) => void; end: (b: string) => void }) {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}
