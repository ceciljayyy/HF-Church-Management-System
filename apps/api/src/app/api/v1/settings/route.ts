import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';
import { hasPermission } from '@/lib/rbac';

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']).default('JSON'),
});

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'settings.view')) return failure('Forbidden', 403);
  const items = await prisma.setting.findMany({
    where: { branchId: session.branchId },
    orderBy: { key: 'asc' },
  });
  return success({ items });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'settings.updateProfile')) return failure('Forbidden', 403);
    const body = settingSchema.parse(await req.json());
    const existing = await prisma.setting.findUnique({
      where: { branchId_key: { branchId: session.branchId, key: body.key } },
    });
    const item = await prisma.setting.upsert({
      where: { branchId_key: { branchId: session.branchId, key: body.key } },
      update: { value: body.value as any, type: body.type },
      create: { branchId: session.branchId, key: body.key, value: body.value as any, type: body.type },
    });
    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: existing ? 'SETTING_UPDATE' : 'SETTING_CREATE',
      entity: 'Setting',
      entityId: item.id,
      module: 'settings',
      oldValue: existing ? { key: existing.key, value: existing.value, type: existing.type } : null,
      newValue: { key: item.key, value: item.value, type: item.type },
      ...auditMetaFromRequest(req),
    });
    return success({ item });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to save setting', 500);
  }
}

export const PATCH = POST;
