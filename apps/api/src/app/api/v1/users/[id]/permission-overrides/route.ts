import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auditMetaFromRequest, writeAuditLog } from '@/lib/audit';
import { requirePermission } from '@/lib/access-control';
import { failure, success } from '@/lib/http';
import { getAuthedSession } from '@/lib/people';

const overrideSchema = z.object({
  permissionKey: z.string().min(1),
  effect: z.enum(['ALLOW', 'DENY']),
  scopeType: z.enum(['GLOBAL', 'DEPARTMENT', 'SELF', 'NONE']).default('GLOBAL'),
  scopeId: z.string().optional().nullable(),
  reason: z.string().trim().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'permissions.override');
  if (denied) return denied;

  try {
    const { id: userId } = await params;
    const body = overrideSchema.parse(await req.json());
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, branchId: true } });
    if (!target) return failure('User not found', 404);
    const permission = await prisma.permission.findUnique({ where: { key: body.permissionKey } });
    if (!permission) return failure('Permission not found', 404);
    const scopeId = body.scopeType === 'GLOBAL' || body.scopeType === 'NONE' ? null : body.scopeId ?? null;

    const existing = await prisma.userPermissionOverride.findFirst({
      where: { userId, permissionId: permission.id, scopeType: body.scopeType, scopeId },
    });

    const item = existing
      ? await prisma.userPermissionOverride.update({
          where: { id: existing.id },
          data: {
            effect: body.effect,
            reason: body.reason,
            grantedById: session.userId,
          },
          include: { permission: true },
        })
      : await prisma.userPermissionOverride.create({
          data: {
            userId,
            permissionId: permission.id,
            effect: body.effect,
            scopeType: body.scopeType,
            scopeId,
            reason: body.reason,
            grantedById: session.userId,
          },
          include: { permission: true },
        });

    await writeAuditLog({
      branchId: target.branchId,
      userId: session.userId,
      action: 'permission.override.added',
      entity: 'UserPermissionOverride',
      entityId: item.id,
      newValue: {
        targetUserId: userId,
        permission: permission.key,
        effect: body.effect,
        scopeType: body.scopeType,
        scopeId,
      },
      ...auditMetaFromRequest(req),
    });

    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to save permission override', 500, error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'permissions.override');
  if (denied) return denied;

  const { id: userId } = await params;
  const overrideId = req.nextUrl.searchParams.get('overrideId');
  if (!overrideId) return failure('Missing override id', 400);

  const existing = await prisma.userPermissionOverride.findFirst({
    where: { id: overrideId, userId },
    include: { user: true, permission: true },
  });
  if (!existing) return failure('Override not found', 404);

  await prisma.userPermissionOverride.delete({ where: { id: overrideId } });
  await writeAuditLog({
    branchId: existing.user.branchId,
    userId: session.userId,
    action: 'permission.override.removed',
    entity: 'UserPermissionOverride',
    entityId: overrideId,
    oldValue: { targetUserId: userId, permission: existing.permission.key, effect: existing.effect },
    ...auditMetaFromRequest(req),
  });

  return success({ deleted: true });
}
