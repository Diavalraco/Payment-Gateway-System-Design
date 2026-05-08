import { loadEnv } from '../../../infrastructure/config/env';
import { gatewaySimulator, GatewaySimulatorService } from './gatewaySimulator.service';
import { CircuitBreakerService } from './circuitBreaker.service';
import { GatewayError } from '../../../common/exceptions/appError';
import { gatewayLatencyHistogram } from '../../../infrastructure/monitoring/metrics';

let breaker: CircuitBreakerService | undefined;

export class GatewayClientService {
  constructor(
    private readonly sim: GatewaySimulatorService = gatewaySimulator,
  ) {}

  private getBreaker(): CircuitBreakerService {
    if (!breaker) {
      const e = loadEnv();
      breaker = new CircuitBreakerService(
        e.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        e.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
      );
    }
    return breaker;
  }

  /**
   * Execute simulated charge against external gateway profile.
   */
  async charge(_paymentId: string): Promise<{
    success: boolean;
    gatewayTxnId?: string;
    duplicateWebhook?: boolean;
    error?: GatewayError;
  }> {
    const outcome = this.sim.simulate();
    const start = Date.now();
    await this.sim.sleep(outcome.latencyMs);
    gatewayLatencyHistogram.observe(Date.now() - start);

    if (outcome.kind === 'success') {
      return this.getBreaker()
        .execute(async () => ({ success: true, gatewayTxnId: outcome.gatewayTxnId }))
        .catch((err: Error) => ({
          success: false,
          error:
            err.message === 'CIRCUIT_OPEN'
              ? new GatewayError('circuit_open', true, 'CIRCUIT_OPEN')
              : new GatewayError(err.message, true),
        }));
    }
    if (outcome.kind === 'webhook_duplicate') {
      return {
        success: true,
        gatewayTxnId: outcome.gatewayTxnId,
        duplicateWebhook: true,
      };
    }

    const err = this.sim.wrapAsError(outcome);
    try {
      return await this.getBreaker().execute(async () => {
        if (err) throw err;
        return { success: false };
      });
    } catch (e: unknown) {
      const ge = e instanceof GatewayError ? e : new GatewayError(String(e), true);
      return { success: false, error: ge };
    }
  }
}

export const gatewayClient = new GatewayClientService();
