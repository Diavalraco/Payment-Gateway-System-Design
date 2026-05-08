import { outboxPublisher } from '../modules/outbox/services/outboxPublisher.service';
export async function startOutboxWorker(signal: AbortSignal): Promise<void> {
  await outboxPublisher.runLoop(signal);
}
