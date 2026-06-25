import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';
import { failure, success } from '@/lib/http';
import { canManageChurchProfile, churchProfileSchema, toChurchProfileData } from '@/lib/church-profile';
import { getRequestSession } from '@/lib/request-session';
import { hasPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'settings.view')) return failure('Forbidden', 403);

  const churchProfile = await (prisma as any).churchProfile.findUnique({
    where: { branchId: session.branchId },
  });

  return success({ churchProfile });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!canManageChurchProfile(session)) return failure('You do not have permission to perform this action.', 403);

    const body = churchProfileSchema.parse(await req.json());
    const existing = await (prisma as any).churchProfile.findUnique({ where: { branchId: session.branchId } });
    if (!existing) return failure('Church profile does not exist.', 404);

    const churchProfile = await (prisma as any).churchProfile.update({
      where: { branchId: session.branchId },
      data: { ...toChurchProfileData(body), updatedById: session.userId },
    });

    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'UPDATE',
      entity: 'ChurchProfile',
      entityId: churchProfile.id,
      module: 'Settings',
      oldValue: { churchName: existing.churchName, email: existing.email },
      newValue: { churchName: churchProfile.churchName, email: churchProfile.email },
      details: { description: 'Church profile updated' },
      ...auditMetaFromRequest(req),
    });

    return success({ churchProfile });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to update church profile.', 500);
  }
}
