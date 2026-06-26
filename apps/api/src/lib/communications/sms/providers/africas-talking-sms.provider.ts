import type { SmsProvider } from '../sms.types';

export const africasTalkingSmsProviderPlaceholder: SmsProvider = {
  name: 'africas_talking',
  async sendSms() {
    return { success: false, status: 'FAILED', errorMessage: "Africa's Talking SMS provider is not implemented yet." };
  },
};
