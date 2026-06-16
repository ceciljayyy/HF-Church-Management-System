import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';
import { failure, success } from '@/lib/http';
import { canManageChurchProfile } from '@/lib/church-profile';
import { getRequestSession } from '@/lib/request-session';

const logoSchema = z.object({
  logoUrl: z.string().trim().url(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!canManageChurchProfile(session)) return failure('You do not have permission to perform this action.', 403);

    const body = logoSchema.parse(await req.json());
    const churchProfile = await (prisma as any).churchProfile.update({
      where: { branchId: session.branchId },
      data: { logoUrl: body.logoUrl, updatedById: session.userId },
    });

    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'UPDATE',
      entity: 'ChurchProfile',
      entityId: churchProfile.id,
      module: 'Settings',
      newValue: { logoUrl: body.logoUrl },
      details: { description: 'Church logo updated' },
      ...auditMetaFromRequest(req),
    });

    return success({ churchProfile });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to upload logo.', 500);
  }
}
