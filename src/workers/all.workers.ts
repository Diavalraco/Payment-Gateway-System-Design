import { bootstrapInfrastructure, shutdownInfrastructure } from '../bootstrap';
import { startOutboxWorker } from './outbox.worker';
import { startPaymentWorker } from './payment.worker';
import { startRetryWorker } from './retry.worker';
import { startDlqWorker } from './dlq.worker';
import { startWebhookWorker } from './webhook.worker';
import { startAuditKafkaConsumer } from '../modules/audit/consumers/audit.consumer';
import { startNotificationKafkaConsumer } from '../modules/notification/consumers/notification.consumer';

async function main() {
  await bootstrapInfrastructure();

  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());

  await Promise.all([
    startOutboxWorker(controller.signal),
    startPaymentWorker(controller.signal),
    startRetryWorker(controller.signal),
    startDlqWorker(controller.signal),
    startWebhookWorker(controller.signal),
    startAuditKafkaConsumer(controller.signal),
    startNotificationKafkaConsumer(controller.signal),
  ]);

  await shutdownInfrastructure();
}

void main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  await shutdownInfrastructure().catch(() => undefined);
  process.exit(1);
});
