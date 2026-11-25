import { env } from '../../config/env.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<void>;
}

/**
 * Provider-independent local development email adapter.
 * Does not require a paid external email provider during Phase 0.
 */
class LocalDevEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage): Promise<void> {
    if (env.NODE_ENV !== 'test') {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          component: 'LocalDevEmailProvider',
          to: message.to,
          subject: message.subject,
          status: 'dispatched_locally',
        }),
      );
    }
  }
}

export const emailProvider: EmailProvider = new LocalDevEmailProvider();
