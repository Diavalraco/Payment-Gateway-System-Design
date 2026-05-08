import { exponentialBackoff } from '../../modules/retry/services/exponentialBackoff.service';

describe('ExponentialBackoffService', () => {
  it('computes deterministic scale when RNG fixed', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const svc = exponentialBackoff;
    expect(svc.delayMs(0, 2000)).toBeGreaterThanOrEqual(2000);
    expect(svc.delayMs(1, 2000)).toBeGreaterThanOrEqual(4000);
    jest.restoreAllMocks();
  });
});
