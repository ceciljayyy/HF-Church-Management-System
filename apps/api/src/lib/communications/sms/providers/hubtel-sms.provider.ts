import type { SmsProvider } from '../sms.types';

export const hubtelSmsProviderPlaceholder: SmsProvider = {
  name: 'hubtel',
  async sendSms() {
    return { success: false, status: 'FAILED', errorMessage: 'Hubtel SMS provider is not implemented yet.' };
  },
};
