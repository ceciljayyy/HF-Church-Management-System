import { z } from 'zod';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/auth';
import { buildSessionCookie, createSessionToken } from '@/lib/session';
import { failure, success } from '@/lib/http';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';
import { getUserAccess } from '@/lib/access-control';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        branchId: true,
        name: true,
        email: true,
        passwordHash: true,
        avatarUrl: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE')
      return failure('Invalid credentials', 401);
    const ok = await comparePassword(body.password, user.passwordHash);
    if (!ok) return failure('Invalid credentials', 401);

    const access = await getUserAccess(user.id);
    if (!access) return failure('Invalid credentials', 401);
    const roles = access.roles.map((role) => role.name);
    const permissions = access.permissions;
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
      select: { id: true },
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
        username: null,
        email: user.email,
        phone: null,
        avatarUrl: user.avatarUrl,
        branchId: user.branchId,
        status: user.status,
        mustChangePassword: false,
        roles,
        permissions,
      },
      person: access.person,
      roles: access.roles,
      permissions,
      scopes: access.scopes,
      permissionOverrides: access.permissionOverrides,
    });
    response.cookies.set(buildSessionCookie(token));
    return response;
  } catch (error) {
    if (error instanceof z.ZodError)
      return failure('Validation error', 422, error.flatten());
    return failure('Unable to login', 500);
  }
}
