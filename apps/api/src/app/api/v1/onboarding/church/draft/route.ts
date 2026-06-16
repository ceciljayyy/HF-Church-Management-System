import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { canManageChurchProfile, churchProfileDraftSchema } from '@/lib/church-profile';
import { getRequestSession } from '@/lib/request-session';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!canManageChurchProfile(session)) return failure('You do not have permission to perform this action.', 403);

    const body = churchProfileDraftSchema.parse(await req.json());
    const existing = await (prisma as any).churchProfile.findUnique({ where: { branchId: session.branchId } });
    const base = {
      churchName: body.churchName || existing?.churchName || 'Untitled Church',
      phone: body.phone || existing?.phone || '',
      email: body.email || existing?.email || session.email,
      adminContactName: body.adminContactName || existing?.adminContactName || '',
      adminContactPhone: body.adminContactPhone || existing?.adminContactPhone || '',
      city: body.city || existing?.city || '',
      country: body.country || existing?.country || 'Ghana',
    };

    const churchProfile = await (prisma as any).churchProfile.upsert({
      where: { branchId: session.branchId },
      update: { ...body, updatedById: session.userId },
      create: {
        ...base,
        ...body,
        branchId: session.branchId,
        createdById: session.userId,
        updatedById: session.userId,
      },
    });

    return success({ churchProfile });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to save church draft.', 500);
  }
}
