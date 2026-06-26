import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CommunicationChannel, CommunicationPurpose, CommunicationStatus } from './communication.types';

export async function createCommunicationLog(input: {
  branchId: string;
  channel: CommunicationChannel;
  purpose: CommunicationPurpose;
  recipientPersonId?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  message: string;
  provider?: string | null;
  senderId?: string | null;
  status: CommunicationStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  rawResponseJson?: unknown;
  sentByUserId?: string | null;
  sentAt?: Date | null;
}) {
  return prisma.communicationLog.create({
    data: {
      ...input,
      rawResponseJson: input.rawResponseJson === undefined ? undefined : (input.rawResponseJson as Prisma.InputJsonValue),
    },
  });
}
