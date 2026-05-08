import { createLogger } from '../../../infrastructure/logger/logger';

const logger = createLogger('circuit-breaker');

type State = 'closed' | 'open' | 'half_open';

export class CircuitBreakerService {
  private failures = 0;
  private state: State = 'closed';
  private openedAt = 0;

  constructor(
    private readonly failureThreshold: number,
    private readonly resetTimeoutMs: number,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt > this.resetTimeoutMs) {
        this.state = 'half_open';
        logger.info({ msg: 'circuit half-open' });
      } else {
        throw new Error('CIRCUIT_OPEN');
      }
    }
    try {
      const result = await fn();
      if (this.state === 'half_open') {
        this.state = 'closed';
        this.failures = 0;
      } else if (this.state === 'closed') {
        this.failures = Math.max(0, this.failures - 1);
      }
      return result;
    } catch (err) {
      this.failures += 1;
      logger.warn({ err, failures: this.failures }, 'circuit failure');
      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
        this.openedAt = Date.now();
        logger.error({ failures: this.failures }, 'circuit opened');
      }
      throw err;
    }
  }
}
