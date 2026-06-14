import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { failure, success } from '@/lib/http';

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return failure('Unauthorized', 401);

  try {
    const session = await verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        branch: true,
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user) return failure('Unauthorized', 401);

    const roles = user.roles.map((entry) => entry.role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((entry) =>
          entry.role.permissions.map((rp) => rp.permission.key),
        ),
      ),
    ];
    const profileSetting = await prisma.setting.findUnique({
      where: { branchId_key: { branchId: user.branchId, key: `userProfile.${user.id}` } },
    });

    return success({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        branchId: user.branchId,
        branch: user.branch,
        status: user.status,
        roles,
        permissions,
        profile: profileSetting?.value ?? null,
      },
    });
  } catch {
    return failure('Unauthorized', 401);
  }
}
