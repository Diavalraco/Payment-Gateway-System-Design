import { createLogger } from '../../../infrastructure/logger/logger';

const logger = createLogger('notification-service');

export class NotificationService {
  async dispatch(event: { type: string; paymentId?: string; payload?: Record<string, unknown> }) {
    logger.info({ event }, 'notification stub (email/sms provider integration point)');
  }
}

export const notificationService = new NotificationService();
