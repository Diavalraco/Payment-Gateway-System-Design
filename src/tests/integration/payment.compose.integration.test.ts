import { createHmac, randomUUID } from 'crypto';

const RUN = process.env.INTEGRATION_TESTS === '1';
const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-webhook-secret-change-me';

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (process.env.API_TOKEN) {
    h['x-api-token'] = process.env.API_TOKEN;
  }
  return h;
}

async function getJson(path: string): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function postJson(
  path: string,
  body: unknown,
  extraHeaders: Record<string, string>,
): Promise<{ status: number; json: unknown; rawBody: string }> {
  const rawBody = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...extraHeaders,
    },
    body: rawBody,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, rawBody };
}

function webhookSignature(rawBody: string): string {
  return `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')}`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

type PaymentJson = {
  id: string;
  status: string;
};

(RUN ? describe : describe.skip)('Full-stack (Docker Compose)', () => {
  it('GET /health returns ok', async () => {
    const { status, json } = await getJson('/health');
    expect(status).toBe(200);
    expect((json as { status: string }).status).toBe('ok');
  });

  it('GET /metrics returns Prometheus text', async () => {
    const res = await fetch(`${BASE}/metrics`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/# HELP|payments_|nodejs_/);
  });

  it('POST /payments then polls until terminal SUCCESS or FAILED (Kafka + workers)', async () => {
    const idem = `it-${randomUUID()}`;
    const { status, json } = await postJson(
      '/payments',
      { amount: '42.00', currency: 'USD', metadata: { suite: 'integration' } },
      { 'Idempotency-Key': idem },
    );
    expect(status).toBe(201);
    const created = json as PaymentJson;
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(['PENDING', 'PROCESSING']).toContain(created.status);

    const deadline = Date.now() + 120_000;
    let last: PaymentJson | null = null;
    while (Date.now() < deadline) {
      const g = await getJson(`/payments/${created.id}`);
      expect(g.status).toBe(200);
      last = g.json as PaymentJson;
      if (last.status === 'SUCCESS' || last.status === 'FAILED') {
        break;
      }
      await sleep(1000);
    }

    expect(last).not.toBeNull();
    expect(last!.status === 'SUCCESS' || last!.status === 'FAILED').toBe(true);
  });

  it('Idempotency-Key: duplicate POST returns same payment id', async () => {
    const idem = `idem-${randomUUID()}`;
    const body = { amount: '1.00', currency: 'EUR' };
    const a = await postJson('/payments', body, { 'Idempotency-Key': idem });
    const b = await postJson('/payments', body, { 'Idempotency-Key': idem });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect((a.json as PaymentJson).id).toBe((b.json as PaymentJson).id);
  });

  it('GET /payments/:id/events includes rows written at creation', async () => {
    const idem = `ev-${randomUUID()}`;
    const { status, json } = await postJson('/payments', { amount: '5.00', currency: 'USD' }, { 'Idempotency-Key': idem });
    expect(status).toBe(201);
    const id = (json as PaymentJson).id;

    const ev = await getJson(`/payments/${id}/events`);
    expect(ev.status).toBe(200);
    const events = (ev.json as { events: { type: string }[] }).events;
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.type.includes('initiated'))).toBe(true);
  });

  it('POST /webhooks/payment-status rejects bad signature', async () => {
    const raw = JSON.stringify({
      eventId: `evt-${randomUUID()}`,
      paymentId: randomUUID(),
      status: 'SUCCESS',
    });
    const res = await fetch(`${BASE}/webhooks/payment-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment-signature': 'sha256=deadbeef',
        ...authHeaders(),
      },
      body: raw,
    });
    expect(res.status).toBe(401);
  });

  it('POST /webhooks/payment-status accepts valid HMAC (204)', async () => {
    const idem = `wh-${randomUUID()}`;
    const { json } = await postJson('/payments', { amount: '3.00', currency: 'USD' }, { 'Idempotency-Key': idem });
    const paymentId = (json as PaymentJson).id;
    const payload = {
      eventId: `evt-${randomUUID()}`,
      paymentId,
      status: 'SUCCESS' as const,
      gatewayRef: 'GW-INTEGRATION',
    };
    const raw = JSON.stringify(payload);
    const res = await fetch(`${BASE}/webhooks/payment-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment-signature': webhookSignature(raw),
        ...authHeaders(),
      },
      body: raw,
    });
    expect(res.status).toBe(204);
  });
});
