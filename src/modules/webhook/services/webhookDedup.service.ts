import { webhookRepository, WebhookRepository } from '../repositories/webhook.repository';

export class WebhookDedupService {
  constructor(private readonly repo: WebhookRepository = webhookRepository) {}

  async isDuplicate(externalId: string): Promise<boolean> {
    const row = await this.repo.findByExternalId(externalId);
    return !!row;
  }
}

export const webhookDedupService = new WebhookDedupService();
