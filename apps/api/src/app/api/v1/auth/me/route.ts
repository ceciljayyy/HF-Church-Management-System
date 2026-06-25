import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserAccess } from '@/lib/access-control';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { failure, success } from '@/lib/http';

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return failure('Unauthorized', 401);

  try {
    const session = await verifySessionToken(token);
    const access = await getUserAccess(session.userId);
    if (!access || access.user.status !== 'ACTIVE') return failure('Unauthorized', 401);

    const profileSetting = await prisma.setting.findUnique({
      where: { branchId_key: { branchId: access.user.branchId, key: `userProfile.${access.user.id}` } },
    });

    const user = {
      id: access.user.id,
      personId: null,
      name: access.user.name,
      username: null,
      email: access.user.email,
      phone: null,
      avatarUrl: access.user.avatarUrl,
      branchId: access.user.branchId,
      branch: access.user.branch,
      status: access.user.status,
      mustChangePassword: false,
      roles: access.roles.map((role) => role.name),
      permissions: access.permissions,
      profile: profileSetting?.value ?? null,
    };

    return success({
      user,
      person: access.person,
      roles: access.roles,
      permissions: access.permissions,
      scopes: access.scopes,
      permissionOverrides: access.permissionOverrides,
    });
  } catch {
    return failure('Unauthorized', 401);
  }
}
