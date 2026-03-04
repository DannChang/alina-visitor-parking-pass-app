import type { SmsProvider, SmsResult } from './sms-provider';

export class ConsoleSmsProvider implements SmsProvider {
  async send(to: string, body: string): Promise<SmsResult> {
    console.log('[SMS Dev] ─────────────────────────────');
    console.log(`[SMS Dev] To: ${to}`);
    console.log(`[SMS Dev] Body: ${body}`);
    console.log('[SMS Dev] ─────────────────────────────');

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }
}
