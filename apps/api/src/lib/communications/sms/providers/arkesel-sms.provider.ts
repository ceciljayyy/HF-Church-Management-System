import type { SmsProvider } from '../sms.types';

export const arkeselSmsProviderPlaceholder: SmsProvider = {
  name: 'arkesel',
  async sendSms() {
    return { success: false, status: 'FAILED', errorMessage: 'Arkesel SMS provider is not implemented yet.' };
  },
};
