import { z } from 'zod';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/auth';
import { buildSessionCookie, createSessionToken } from '@/lib/session';
import { failure, success } from '@/lib/http';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE')
      return failure('Invalid credentials', 401);
    const ok = await comparePassword(body.password, user.passwordHash);
    if (!ok) return failure('Invalid credentials', 401);

    const roles = user.roles.map((userRole) => userRole.role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((userRole) =>
          userRole.role.permissions.map((rp) => rp.permission.key),
        ),
      ),
    ];
    const token = await createSessionToken({
      userId: user.id,
      branchId: user.branchId,
      email: user.email,
      roles,
      permissions,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await createAuditLog({
      branchId: user.branchId,
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      module: 'auth',
      newValue: { message: 'User logged in' },
      ...auditMetaFromRequest(req),
    });

    const response = success({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        branchId: user.branchId,
        status: user.status,
        roles,
        permissions,
      },
    });
    response.cookies.set(buildSessionCookie(token));
    return response;
  } catch (error) {
    if (error instanceof z.ZodError)
      return failure('Validation error', 422, error.flatten());
    return failure('Unable to login', 500);
  }
}
