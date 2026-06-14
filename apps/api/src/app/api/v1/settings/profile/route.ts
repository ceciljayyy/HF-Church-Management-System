import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Valid email is required'),
  username: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  profilePhotoUrl: z.string().trim().url().optional().or(z.literal('')).nullable(),
  bio: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);

    const body = profileSchema.parse(await req.json());
    const existing = await prisma.user.findFirst({
      where: { id: session.userId, branchId: session.branchId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    if (!existing) return failure('User not found', 404);

    const emailOwner = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (emailOwner && emailOwner.id !== session.userId) {
      return failure('Email is already in use', 409);
    }

    const profileExtras = {
      username: body.username ?? '',
      phone: body.phone ?? '',
      bio: body.bio ?? '',
    };

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: {
          name: body.name,
          email: body.email,
          avatarUrl: body.profilePhotoUrl || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          branchId: true,
          branch: true,
          status: true,
        },
      }),
      prisma.setting.upsert({
        where: { branchId_key: { branchId: session.branchId, key: `userProfile.${session.userId}` } },
        update: { value: profileExtras, type: 'JSON' },
        create: {
          branchId: session.branchId,
          key: `userProfile.${session.userId}`,
          value: profileExtras,
          type: 'JSON',
        },
      }),
    ]);

    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'PROFILE_UPDATE',
      entity: 'User',
      entityId: session.userId,
      module: 'settings',
      oldValue: { name: existing.name, email: existing.email, avatarUrl: existing.avatarUrl },
      newValue: { name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      ...auditMetaFromRequest(req),
    });

    return success({ user, profile: profileExtras });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to update profile', 500);
  }
}
