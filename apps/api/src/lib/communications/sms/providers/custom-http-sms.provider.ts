import type { SendSmsInput, SendSmsResult, SmsProvider, SmsSettings } from '../sms.types';

export class CustomHttpSmsProvider implements SmsProvider {
  name = 'custom_http' as const;

  constructor(private settings: SmsSettings) {}

  async validateConfig() {
    return Boolean(this.settings.baseUrl && this.settings.apiKey);
  }

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    if (!(await this.validateConfig())) {
      return { success: false, status: 'FAILED', errorMessage: 'Custom HTTP SMS provider is not configured.' };
    }

    try {
      const response = await fetch(this.settings.baseUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.settings.apiKey ? `Bearer ${this.settings.apiKey}` : '',
        },
        body: JSON.stringify({
          sender: input.senderId,
          to: input.to,
          message: input.message,
          purpose: input.purpose,
        }),
      });
      const text = await response.text();
      const rawResponse = text ? tryJson(text) : null;
      if (!response.ok) {
        return { success: false, status: 'FAILED', errorMessage: `Provider returned ${response.status}`, rawResponse };
      }
      return { success: true, status: 'SENT', providerMessageId: providerId(rawResponse), rawResponse };
    } catch (error) {
      return { success: false, status: 'FAILED', errorMessage: error instanceof Error ? error.message : 'SMS provider did not respond.' };
    }
  }
}

function tryJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { body: text.slice(0, 500) };
  }
}

function providerId(raw: unknown) {
  if (raw && typeof raw === 'object' && 'id' in raw) return String((raw as { id: unknown }).id);
  if (raw && typeof raw === 'object' && 'messageId' in raw) return String((raw as { messageId: unknown }).messageId);
  return undefined;
}
