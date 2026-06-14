import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword } from '@/lib/auth';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);

    const body = passwordSchema.parse(await req.json());
    const user = await prisma.user.findFirst({
      where: { id: session.userId, branchId: session.branchId },
      select: { id: true, passwordHash: true },
    });
    if (!user) return failure('User not found', 404);

    const validCurrentPassword = await comparePassword(body.currentPassword, user.passwordHash);
    if (!validCurrentPassword) return failure('Current password is incorrect', 400);

    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: await hashPassword(body.newPassword) },
    });

    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: session.userId,
      module: 'settings',
      newValue: { message: 'Password changed' },
      ...auditMetaFromRequest(req),
    });

    return success({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to change password', 500);
  }
}
