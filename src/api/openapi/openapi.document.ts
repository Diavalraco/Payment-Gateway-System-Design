/**
 * Shared examples — Swagger UI often ignores `example` on `$ref` schemas and shows
 * placeholder "string" values unless `example` is set on the response Media Type.
 */
const paymentResponseExample = {
  id: 'ab8da259-b6f9-4ebd-ad7f-82efc4ffaf6a',
  amount: '99.99',
  currency: 'USD',
  status: 'PENDING',
  metadata: { orderId: 'ord-123', source: 'swagger' },
  correlationId: 'trace-001',
  gatewayRef: null,
  failureReason: null,
  retryCount: 0,
  createdAt: '2026-05-08T14:33:46.582Z',
  updatedAt: '2026-05-08T14:33:46.582Z',
};

const paymentEventsExample = {
  events: [
    {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      type: 'payment.initiated',
      payload: { amount: '99.99', currency: 'USD' },
      createdAt: '2026-05-08T14:33:46.582Z',
    },
  ],
};

const errorResponseExample = {
  error: {
    code: 'VALIDATION_ERROR',
    message: 'amount: Required; currency: Required',
  },
};

const healthResponseExample = {
  status: 'ok',
  uptimeSec: 42,
  postgres: {},
  redis: { host: 'redis', port: 6379 },
  dbHost: 'postgres',
};

/**
 * Full OpenAPI 3 document (embedded so Swagger works from `dist/` without JSDoc path resolution).
 */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Distributed Payments API',
    version: '1.0.0',
    description:
      'HTTP facade for event-driven payment processing. Writes go through PostgreSQL + transactional outbox; workers consume Kafka (`payment.initiated`, retries, DLQ).',
  },
  servers: [
    { url: '/', description: 'Current host' },
    { url: 'http://localhost:3000', description: 'Local Docker / dev' },
  ],
  tags: [
    { name: 'Payments', description: 'Create and read payment aggregates' },
    { name: 'Webhooks', description: 'Gateway async callbacks (HMAC-signed)' },
    { name: 'Observability', description: 'Health and metrics' },
  ],
  components: {
    securitySchemes: {
      ApiToken: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-token',
        description: 'Optional static token when `API_TOKEN` is set on the server',
      },
    },
    parameters: {
      IdempotencyKey: {
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        schema: { type: 'string', minLength: 1 },
        description: 'Client-supplied key; duplicate POSTs return the same payment snapshot.',
      },
      CorrelationId: {
        name: 'x-correlation-id',
        in: 'header',
        required: false,
        schema: { type: 'string' },
        description: 'Propagated for tracing; generated if omitted.',
      },
      PaymentId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'amount: Required' },
              details: { nullable: true },
            },
          },
        },
        example: errorResponseExample,
      },
      CreatePaymentRequest: {
        type: 'object',
        required: ['amount', 'currency'],
        properties: {
          amount: {
            type: 'string',
            pattern: '^\\d+(\\.\\d+)?$',
            example: '99.99',
            description: 'Decimal amount as string',
          },
          currency: {
            type: 'string',
            minLength: 3,
            maxLength: 3,
            example: 'USD',
          },
          metadata: {
            type: 'object',
            additionalProperties: true,
            description: 'Optional opaque JSON',
            example: { orderId: 'ord-123' },
          },
        },
        example: {
          amount: '99.99',
          currency: 'USD',
          metadata: { orderId: 'ord-123' },
        },
      },
      PaymentResponse: {
        type: 'object',
        required: ['id', 'amount', 'currency', 'status', 'retryCount', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: 'ab8da259-b6f9-4ebd-ad7f-82efc4ffaf6a',
          },
          amount: { type: 'string', example: '99.99', description: 'Decimal as string' },
          currency: { type: 'string', minLength: 3, maxLength: 3, example: 'USD' },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'],
            example: 'PENDING',
          },
          metadata: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
            description: 'Opaque JSON from the create request, or null if omitted',
            example: { orderId: 'ord-123' },
          },
          correlationId: {
            type: 'string',
            nullable: true,
            description: 'Echo of x-correlation-id when provided',
            example: 'trace-001',
          },
          gatewayRef: {
            type: 'string',
            nullable: true,
            description: 'Set after successful gateway / webhook completion',
          },
          failureReason: {
            type: 'string',
            nullable: true,
            description: 'Present when status is FAILED',
          },
          retryCount: { type: 'integer', minimum: 0, example: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        example: paymentResponseExample,
      },
      PaymentEventsResponse: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'type', 'payload', 'createdAt'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                type: { type: 'string', example: 'payment.initiated' },
                payload: { type: 'object', additionalProperties: true },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        example: paymentEventsExample,
      },
      WebhookPaymentStatusRequest: {
        type: 'object',
        required: ['eventId', 'paymentId', 'status'],
        properties: {
          eventId: { type: 'string', description: 'Unique event id for deduplication', example: 'evt_01HZZ' },
          paymentId: { type: 'string', format: 'uuid', example: 'ab8da259-b6f9-4ebd-ad7f-82efc4ffaf6a' },
          status: { type: 'string', enum: ['SUCCESS', 'FAILED'], example: 'SUCCESS' },
          gatewayRef: { type: 'string', nullable: true, example: 'GW-XYZ' },
          reason: { type: 'string', nullable: true },
        },
        example: {
          eventId: 'evt_01HZZ',
          paymentId: 'ab8da259-b6f9-4ebd-ad7f-82efc4ffaf6a',
          status: 'SUCCESS',
          gatewayRef: 'GW-XYZ',
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          uptimeSec: { type: 'integer', example: 42 },
          postgres: { type: 'object' },
          redis: { type: 'object' },
          dbHost: { type: 'string', example: 'postgres' },
        },
        example: healthResponseExample,
      },
    },
  },
  paths: {
    '/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Create payment',
        description:
          'Validates body, enforces idempotency, persists `PENDING` payment, appends domain event, enqueues `payment.initiated` via outbox. Workers transition state asynchronously.',
        operationId: 'createPayment',
        parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }, { $ref: '#/components/parameters/CorrelationId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePaymentRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created (or idempotent replay of same key)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaymentResponse' },
                example: paymentResponseExample,
              },
            },
          },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized (when API_TOKEN configured)' },
          '422': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: errorResponseExample,
              },
            },
          },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment by id',
        operationId: 'getPayment',
        parameters: [{ $ref: '#/components/parameters/PaymentId' }, { $ref: '#/components/parameters/CorrelationId' }],
        responses: {
          '200': {
            description: 'Payment',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaymentResponse' },
                example: paymentResponseExample,
              },
            },
          },
          '404': { description: 'Not found' },
        },
      },
    },
    '/payments/{id}/events': {
      get: {
        tags: ['Payments'],
        summary: 'List payment domain events',
        operationId: 'listPaymentEvents',
        parameters: [{ $ref: '#/components/parameters/PaymentId' }, { $ref: '#/components/parameters/CorrelationId' }],
        responses: {
          '200': {
            description: 'Chronological `payment_events` rows',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaymentEventsResponse' },
                example: paymentEventsExample,
              },
            },
          },
          '404': { description: 'Payment not found' },
        },
      },
    },
    '/webhooks/payment-status': {
      post: {
        tags: ['Webhooks'],
        summary: 'Gateway payment status webhook',
        description:
          'Requires `x-payment-signature: sha256=<hex>` HMAC-SHA256 of the raw JSON body using `WEBHOOK_SECRET`. Duplicate `eventId` is ignored.',
        operationId: 'postPaymentWebhook',
        parameters: [
          {
            name: 'x-payment-signature',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            example: 'sha256=abcdef...',
          },
          { $ref: '#/components/parameters/CorrelationId' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebhookPaymentStatusRequest' },
            },
          },
        },
        responses: {
          '204': { description: 'Accepted / duplicate noop' },
          '401': { description: 'Invalid signature' },
          '422': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: errorResponseExample,
              },
            },
          },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Observability'],
        summary: 'Liveness + dependency checks',
        operationId: 'getHealth',
        parameters: [{ $ref: '#/components/parameters/CorrelationId' }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
                example: healthResponseExample,
              },
            },
          },
          '503': { description: 'Dependency failure' },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['Observability'],
        summary: 'Prometheus metrics',
        description: 'Text exposition format for Prometheus scraping.',
        operationId: 'getMetrics',
        responses: {
          '200': {
            description: 'Prometheus text',
            content: {
              'text/plain': {
                schema: { type: 'string' },
                example: '# HELP nodejs_heap_size_total_bytes ...\n',
              },
            },
          },
        },
      },
    },
  },
};
