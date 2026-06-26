import type { SendSmsInput, SendSmsResult, SmsProvider } from '../sms.types';

export class MockSmsProvider implements SmsProvider {
  name = 'mock' as const;

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    return {
      success: true,
      providerMessageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'MOCK_SENT',
      rawResponse: { mock: true, to: input.to, purpose: input.purpose },
    };
  }

  async sendBulkSms(input: SendSmsInput[]) {
    return Promise.all(input.map((item) => this.sendSms(item)));
  }
}
