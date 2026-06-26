import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { defaultBirthdayMessage, getSmsSettings, publicSmsSettings } from '@/lib/communications/sms/sms-provider.factory';
import { getAuthedSession, requireBranchId } from '@/lib/people';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';

const schema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['mock', 'custom_http', 'hubtel', 'africas_talking', 'arkesel', 'mtn', 'bulksms_ghana']).default('mock'),
  senderId: z.string().trim().min(1).default('HOLYFAMILY'),
  apiKey: z.string().trim().optional(),
  apiSecret: z.string().trim().optional(),
  baseUrl: z.string().trim().optional(),
  defaultBirthdayMessage: z.string().trim().min(1).default(defaultBirthdayMessage),
  defaultEventMessage: z.string().trim().optional(),
  defaultWelfareMessage: z.string().trim().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasAnyPermission(session.permissions, ['settings.view', 'settings.updateCommunications'])) return failure('Forbidden', 403);
  const branchId = await requireBranchId(session.branchId);
  return success({ item: publicSmsSettings(await getSmsSettings(branchId)) });
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'settings.updateCommunications')) return failure('Forbidden', 403);

  try {
    const input = schema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    const current = await getSmsSettings(branchId);
    const value = {
      enabled: input.enabled,
      provider: input.provider,
      senderId: input.senderId,
      apiKey: input.apiKey && input.apiKey !== '********' ? input.apiKey : current.apiKey ?? null,
      apiSecret: input.apiSecret && input.apiSecret !== '********' ? input.apiSecret : current.apiSecret ?? null,
      baseUrl: input.baseUrl ?? '',
      defaultBirthdayMessage: input.defaultBirthdayMessage,
      defaultEventMessage: input.defaultEventMessage ?? current.defaultEventMessage,
      defaultWelfareMessage: input.defaultWelfareMessage ?? current.defaultWelfareMessage,
    };
    const item = await prisma.setting.upsert({
      where: { branchId_key: { branchId, key: 'communications.sms' } },
      update: { value, type: 'JSON' },
      create: { branchId, key: 'communications.sms', value, type: 'JSON' },
    });
    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'sms_settings.updated',
      entity: 'Setting',
      entityId: item.id,
      newValue: { provider: value.provider, enabled: value.enabled, senderId: value.senderId },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });
    return success({ item: publicSmsSettings(await getSmsSettings(branchId)), message: 'Communication settings saved.' });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to save communication settings', 500, error);
  }
}

export const POST = PATCH;
