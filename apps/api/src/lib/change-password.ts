import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auditMetaFromRequest, createAuditLog } from './audit';
import { comparePassword, hashPassword } from './auth';
import { success } from './http';
import { prisma } from './prisma';
import { getRequestSession } from './request-session';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(1, 'New password is required.'),
    confirmPassword: z.string().optional(),
  })
  .refine((value) => !value.confirmPassword || value.newPassword === value.confirmPassword, {
    message: 'New passwords do not match.',
    path: ['confirmPassword'],
  });

function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function passwordFailure(message: string, status: number, code: string, details?: unknown) {
  return NextResponse.json({ error: { message, code }, details }, { status });
}

export async function changePassword(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return passwordFailure('Unauthorized', 401, 'UNAUTHORIZED');

    const body = passwordSchema.parse(await req.json());
    if (body.currentPassword === body.newPassword) {
      return passwordFailure('New password must be different from current password.', 400, 'SAME_PASSWORD');
    }
    if (!isStrongPassword(body.newPassword)) {
      return passwordFailure('Password must be at least 8 characters and include a letter and a number.', 400, 'WEAK_PASSWORD');
    }

    const user = await prisma.user.findFirst({
      where: { id: session.userId, branchId: session.branchId },
      select: { id: true, passwordHash: true },
    });
    if (!user) return passwordFailure('User not found', 404, 'USER_NOT_FOUND');

    const validCurrentPassword = await comparePassword(body.currentPassword, user.passwordHash);
    if (!validCurrentPassword) {
      return passwordFailure('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: await hashPassword(body.newPassword), mustChangePassword: false },
    });

    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: session.userId,
      module: 'Auth',
      details: { description: 'User changed their password.' },
      ...auditMetaFromRequest(req),
    });

    return success({ message: 'Password changed successfully.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? 'Validation error';
      return passwordFailure(message, 422, 'VALIDATION_ERROR', error.flatten());
    }
    return passwordFailure('Unable to change password. Please try again.', 500, 'CHANGE_PASSWORD_FAILED');
  }
}
