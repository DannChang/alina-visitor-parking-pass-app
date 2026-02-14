import type { SmsProvider, SmsResult } from './sms-provider';

export class TwilioSmsProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER ?? '';

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error('Twilio environment variables are not configured');
    }
  }

  async send(to: string, body: string): Promise<SmsResult> {
    // TODO: Implement Twilio API call
    // For now, this is a stub that returns an error indicating Twilio is not yet implemented
    console.warn('[SMS Twilio] Twilio integration not yet implemented. Message not sent.');
    console.warn(`[SMS Twilio] To: ${to}, Body: ${body}`);

    return {
      success: false,
      error: 'Twilio integration not yet implemented',
    };
  }
}
