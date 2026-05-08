import { nanoid } from 'nanoid';
import { loadEnv } from '../../../infrastructure/config/env';
import { createLogger } from '../../../infrastructure/logger/logger';
import { GatewayError } from '../../../common/exceptions/appError';

const logger = createLogger('gateway-simulator');

export type SimulatedOutcome =
  | { kind: 'success'; latencyMs: number; gatewayTxnId: string }
  | { kind: 'failure'; latencyMs: number; reason: string }
  | { kind: 'timeout'; latencyMs: number }
  | { kind: 'network'; latencyMs: number }
  | { kind: 'webhook_duplicate'; latencyMs: number; gatewayTxnId: string };

/**
 * Probabilistic gateway with configurable success/failure/timeout rates + network errors.
 */
export class GatewaySimulatorService {
  simulate(): SimulatedOutcome {
    const env = loadEnv();
    const r = Math.random();
    const s = env.GATEWAY_SUCCESS_RATE;
    const f = env.GATEWAY_FAILURE_RATE;
    const t = env.GATEWAY_TIMEOUT_RATE;
    const jitter = Math.floor(Math.random() * 2500);

    const baseLatency = () => 200 + jitter + Math.floor(Math.random() * 1200);

    if (r < s) {
      return { kind: 'success', latencyMs: baseLatency(), gatewayTxnId: `GW-${nanoid(12)}` };
    }
    if (r < s + f) {
      const duplicate = Math.random() < 0.08;
      if (duplicate) {
        return {
          kind: 'webhook_duplicate',
          latencyMs: baseLatency(),
          gatewayTxnId: `GW-${nanoid(12)}`,
        };
      }
      return {
        kind: 'failure',
        latencyMs: baseLatency(),
        reason: Math.random() < 0.5 ? 'issuer_declined' : 'risk_blocked',
      };
    }
    if (r < s + f + t) {
      return { kind: 'timeout', latencyMs: env.PAYMENT_TIMEOUT_MS + 500 + jitter };
    }
    return { kind: 'network', latencyMs: baseLatency() };
  }

  sleep(ms: number): Promise<void> {
    logger.debug({ ms }, 'gateway latency');
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  classifyTransient(outcome: SimulatedOutcome, err?: Error): boolean {
    if (outcome.kind === 'timeout' || outcome.kind === 'network') return true;
    if (err && /ENETRESET|ECONNRESET|EAI_AGAIN/.test(err.message)) return true;
    if (outcome.kind === 'failure' && outcome.reason === 'risk_blocked') return true;
    return false;
  }

  wrapAsError(outcome: SimulatedOutcome): GatewayError | null {
    if (outcome.kind === 'failure') {
      return new GatewayError(outcome.reason, outcome.reason !== 'issuer_declined', 'GATEWAY_DECLINED');
    }
    if (outcome.kind === 'timeout') {
      return new GatewayError('upstream_timeout', true, 'TIMEOUT');
    }
    if (outcome.kind === 'network') {
      return new GatewayError('network_error', true, 'NETWORK');
    }
    return null;
  }
}

export const gatewaySimulator = new GatewaySimulatorService();
