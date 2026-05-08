class SingleFlight<K, V> {
  private flights = new Map<K, Promise<V>>();

  run(key: K, factory: () => Promise<V>): Promise<V> {
    const hit = this.flights.get(key);
    if (hit) return hit;
    const p = factory().finally(() => this.flights.delete(key));
    this.flights.set(key, p);
    return p;
  }

  peek(key: K) {
    return this.flights.get(key);
  }
}

describe('idempotency single-flight simulation', () => {
  it('runs factory once across 100 parallel logical requests', async () => {
    const sf = new SingleFlight<string, string>();
    let calls = 0;
    const key = 'same-key';

    const tasks = Array.from({ length: 100 }, () =>
      sf.run(key, async () => {
        calls += 1;
        return 'canonical-payment-id';
      }),
    );

    const results = await Promise.all(tasks);
    expect(calls).toBe(1);
    expect(new Set(results).size).toBe(1);
  });
});
