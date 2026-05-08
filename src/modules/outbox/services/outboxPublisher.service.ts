import { publishMessage } from '../../../infrastructure/kafka/kafka.producer';
import { outboxRepository, OutboxRepository } from '../repositories/outbox.repository';
import { createLogger } from '../../../infrastructure/logger/logger';
import { loadEnv } from '../../../infrastructure/config/env';

const logger = createLogger('outbox-publisher');

export class OutboxPublisherService {
  constructor(private readonly repo: OutboxRepository = outboxRepository) {}

  async publishPendingBatch(): Promise<number> {
    const limit = 50;
    const rows = await this.repo.claimBatch(limit);
    let count = 0;
    for (const row of rows) {
      try {
        await publishMessage({
          topic: row.topic,
          messages: [
            {
              key: row.aggregateId,
              value: JSON.stringify(row.payload),
              headers: Object.fromEntries(
                Object.entries((row.headers as Record<string, string>) ?? {}).map(([k, v]) => [k, String(v)]),
              ),
            },
          ],
        });
        await this.repo.markPublished(row.id);
        count += 1;
      } catch (err) {
        await this.repo.markFailure(row.id, err instanceof Error ? err.message : String(err));
        logger.error({ err, outboxId: row.id }, 'outbox publish failed');
      }
    }
    return count;
  }

  async runLoop(abort: AbortSignal): Promise<void> {
    const poll = loadEnv().OUTBOX_POLL_MS;
    while (!abort.aborted) {
      try {
        await this.publishPendingBatch();
      } catch (err) {
        logger.error({ err }, 'outbox loop error');
      }
      await new Promise((r) => setTimeout(r, poll));
    }
  }
}

export const outboxPublisher = new OutboxPublisherService();
