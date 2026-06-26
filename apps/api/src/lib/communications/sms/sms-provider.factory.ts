import { prisma } from '@/lib/prisma';
import { CustomHttpSmsProvider } from './providers/custom-http-sms.provider';
import { MockSmsProvider } from './providers/mock-sms.provider';
import { africasTalkingSmsProviderPlaceholder } from './providers/africas-talking-sms.provider';
import { arkeselSmsProviderPlaceholder } from './providers/arkesel-sms.provider';
import { hubtelSmsProviderPlaceholder } from './providers/hubtel-sms.provider';
import type { SmsProvider, SmsProviderName, SmsSettings } from './sms.types';

const providerNames = new Set(['mock', 'custom_http', 'hubtel', 'africas_talking', 'arkesel', 'mtn', 'bulksms_ghana']);

export const defaultBirthdayMessage =
  'Happy birthday, {firstName}! God bless you and increase you on every side. From {churchName}.';

export async function getSmsSettings(branchId: string): Promise<SmsSettings> {
  const setting = await prisma.setting.findUnique({
    where: { branchId_key: { branchId, key: 'communications.sms' } },
  });
  const dbValue = isObject(setting?.value) ? setting.value : {};
  const envProvider = providerValue(process.env.SMS_PROVIDER);
  const dbProvider = providerValue(stringValue(dbValue.provider));

  return {
    enabled: envBoolean(process.env.SMS_ENABLED, booleanValue(dbValue.enabled, false)),
    provider: envProvider ?? dbProvider ?? 'mock',
    senderId: process.env.SMS_SENDER_ID || stringValue(dbValue.senderId) || 'HOLYFAMILY',
    apiKey: process.env.SMS_API_KEY || stringValue(dbValue.apiKey),
    apiSecret: process.env.SMS_API_SECRET || stringValue(dbValue.apiSecret),
    baseUrl: process.env.SMS_BASE_URL || stringValue(dbValue.baseUrl),
    defaultBirthdayMessage: stringValue(dbValue.defaultBirthdayMessage) || defaultBirthdayMessage,
    defaultEventMessage: stringValue(dbValue.defaultEventMessage) || 'You are invited to {eventName}. From {churchName}.',
    defaultWelfareMessage: stringValue(dbValue.defaultWelfareMessage) || 'Welfare reminder from {churchName}.',
  };
}

export function createSmsProvider(settings: SmsSettings): SmsProvider {
  switch (settings.provider) {
    case 'custom_http':
      return new CustomHttpSmsProvider(settings);
    case 'hubtel':
      return hubtelSmsProviderPlaceholder;
    case 'africas_talking':
      return africasTalkingSmsProviderPlaceholder;
    case 'arkesel':
      return arkeselSmsProviderPlaceholder;
    case 'mtn':
    case 'bulksms_ghana':
    case 'mock':
    default:
      return new MockSmsProvider();
  }
}

export function publicSmsSettings(settings: SmsSettings) {
  return {
    enabled: settings.enabled,
    provider: settings.provider,
    senderId: settings.senderId,
    baseUrl: settings.baseUrl ?? '',
    apiKey: settings.apiKey ? '********' : '',
    apiSecret: settings.apiSecret ? '********' : '',
    defaultBirthdayMessage: settings.defaultBirthdayMessage,
    defaultEventMessage: settings.defaultEventMessage,
    defaultWelfareMessage: settings.defaultWelfareMessage,
  };
}

function providerValue(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized && providerNames.has(normalized) ? (normalized as SmsProviderName) : undefined;
}

function envBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
