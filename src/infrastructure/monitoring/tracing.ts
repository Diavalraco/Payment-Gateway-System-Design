/* eslint-disable @typescript-eslint/no-var-requires */
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';
import { loadEnv } from '../config/env';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { createLogger } from '../logger/logger';

const logger = createLogger('tracing');

let sdk: NodeSDK | null = null;

export async function initTracing(): Promise<void> {
  const env = loadEnv();
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    logger.info('Skipping OpenTelemetry (no OTEL_EXPORTER_OTLP_ENDPOINT)');
    return;
  }
  try {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
    const base = env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/+$/, '');
    const exporter = new OTLPTraceExporter({ url: `${base}/v1/traces` });
    sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: env.SERVICE_NAME,
      }),
      traceExporter: exporter,
      instrumentations: [getNodeAutoInstrumentations()],
    });
    await sdk.start();
    logger.info('OpenTelemetry initialized');
  } catch (err) {
    logger.error({ err }, 'OpenTelemetry failed to start');
  }
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
