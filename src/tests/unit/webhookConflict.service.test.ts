import { webhookConflictService } from '../../modules/webhook/services/webhookConflict.service';

describe('WebhookConflictService', () => {
  const svc = webhookConflictService;

  it('SUCCESS overrides PROCESSING precedence', () => {
    expect(svc.shouldApply('PROCESSING', 'SUCCESS')).toBe(true);
  });

  it('FAILED does not downgrade SUCCESS', () => {
    expect(svc.shouldApply('SUCCESS', 'FAILED')).toBe(false);
  });
});
