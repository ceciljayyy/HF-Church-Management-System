import type { CommunicationPurpose } from '../communication.types';

export type SmsProviderName = 'mock' | 'custom_http' | 'hubtel' | 'africas_talking' | 'arkesel' | 'mtn' | 'bulksms_ghana';

export type SmsSettings = {
  enabled: boolean;
  provider: SmsProviderName;
  senderId: string;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  defaultBirthdayMessage: string;
  defaultEventMessage: string;
  defaultWelfareMessage: string;
};

export type SendSmsInput = {
  to: string;
  message: string;
  senderId: string;
  purpose: CommunicationPurpose;
  metadata?: Record<string, unknown>;
};

export type SendSmsResult = {
  success: boolean;
  providerMessageId?: string;
  status: 'SENT' | 'FAILED' | 'PENDING' | 'MOCK_SENT';
  errorMessage?: string;
  rawResponse?: unknown;
};

export interface SmsProvider {
  name: SmsProviderName;
  sendSms(input: SendSmsInput): Promise<SendSmsResult>;
  sendBulkSms?(input: SendSmsInput[]): Promise<SendSmsResult[]>;
  getBalance?(): Promise<unknown>;
  validateConfig?(): Promise<boolean>;
}
