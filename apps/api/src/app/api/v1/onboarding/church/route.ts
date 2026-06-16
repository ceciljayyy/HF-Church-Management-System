import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';
import { failure, success } from '@/lib/http';
import { canManageChurchProfile, churchProfileSchema, toChurchProfileData } from '@/lib/church-profile';
import { getRequestSession } from '@/lib/request-session';

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!canManageChurchProfile(session)) return failure('You do not have permission to perform this action.', 403);

    const body = churchProfileSchema.parse(await req.json());
    const existing = await (prisma as any).churchProfile.findUnique({
      where: { branchId: session.branchId },
    });
    const data = toChurchProfileData(body);
    const churchProfile = await (prisma as any).churchProfile.upsert({
      where: { branchId: session.branchId },
      update: {
        ...data,
        onboardingCompleted: true,
        onboardingCompletedAt: existing?.onboardingCompletedAt ?? new Date(),
        updatedById: session.userId,
      },
      create: {
        ...data,
        branchId: session.branchId,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        createdById: session.userId,
        updatedById: session.userId,
      },
    });

    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: existing ? 'UPDATE' : 'CREATE',
      entity: 'ChurchProfile',
      entityId: churchProfile.id,
      module: 'Onboarding',
      oldValue: existing ? { churchName: existing.churchName, onboardingCompleted: existing.onboardingCompleted } : null,
      newValue: { churchName: churchProfile.churchName, onboardingCompleted: true },
      details: { description: 'Church onboarding completed' },
      ...auditMetaFromRequest(req),
    });

    return success({ churchProfile });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to save church information.', 500);
  }
}
