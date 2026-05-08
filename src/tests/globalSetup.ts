const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

export default async function globalSetup(): Promise<void> {
  if (process.env.INTEGRATION_TESTS !== '1') {
    return;
  }

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) {
        const body = (await res.json()) as { status?: string };
        if (body.status === 'ok') {
          // eslint-disable-next-line no-console
          console.info(`[globalSetup] stack healthy at ${BASE}`);
          return;
        }
      }
    } catch {
      /* stack not ready */
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  throw new Error(
    `INTEGRATION_TESTS=1 but ${BASE}/health did not become ready within 180s. Start stack: docker compose up --build`,
  );
}
