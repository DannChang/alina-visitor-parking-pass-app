import type { SmsProvider } from './sms-provider';
import { ConsoleSmsProvider } from './console-sms-provider';
import { TwilioSmsProvider } from './twilio-sms-provider';

export type { SmsProvider, SmsResult } from './sms-provider';

let smsProviderInstance: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (smsProviderInstance) {
    return smsProviderInstance;
  }

  const hasTwilioConfig =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER;

  if (hasTwilioConfig) {
    try {
      smsProviderInstance = new TwilioSmsProvider();
    } catch {
      console.warn('[SMS] Failed to initialize Twilio, falling back to console provider');
      smsProviderInstance = new ConsoleSmsProvider();
    }
  } else {
    smsProviderInstance = new ConsoleSmsProvider();
  }

  return smsProviderInstance;
}
