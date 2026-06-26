import { createCommunicationLog } from '../communication-log';
import type { CommunicationPurpose } from '../communication.types';
import { createSmsProvider, getSmsSettings } from './sms-provider.factory';
import type { SendSmsResult } from './sms.types';

export async function sendSms(input: {
  branchId: string;
  to: string;
  message: string;
  purpose: CommunicationPurpose;
  recipientPersonId?: string | null;
  recipientName?: string | null;
  sentByUserId?: string | null;
}) {
  const settings = await getSmsSettings(input.branchId);
  const provider = createSmsProvider(settings);

  if (!settings.enabled && settings.provider !== 'mock') {
    const result: SendSmsResult = {
      success: false,
      status: 'FAILED',
      errorMessage: 'SMS is currently disabled in communication settings.',
    };
    await logSms(input, settings.provider, settings.senderId, result);
    return result;
  }

  const result = await provider.sendSms({
    to: input.to,
    message: input.message,
    senderId: settings.senderId,
    purpose: input.purpose,
  });

  await logSms(input, provider.name, settings.senderId, result);
  return result;
}

async function logSms(
  input: {
    branchId: string;
    to: string;
    message: string;
    purpose: CommunicationPurpose;
    recipientPersonId?: string | null;
    recipientName?: string | null;
    sentByUserId?: string | null;
  },
  provider: string,
  senderId: string,
  result: SendSmsResult,
) {
  await createCommunicationLog({
    branchId: input.branchId,
    channel: 'SMS',
    purpose: input.purpose,
    recipientPersonId: input.recipientPersonId,
    recipientName: input.recipientName,
    recipientPhone: input.to,
    message: input.message,
    provider,
    senderId,
    status: result.status,
    providerMessageId: result.providerMessageId,
    errorMessage: result.errorMessage,
    rawResponseJson: result.rawResponse,
    sentByUserId: input.sentByUserId,
    sentAt: result.success ? new Date() : null,
  });
}
