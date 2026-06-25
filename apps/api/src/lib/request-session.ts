import type { NextRequest } from 'next/server';
import { getTokenFromRequest, verifySessionToken } from './session';
import { getUserAccess } from './access-control';

export async function getRequestSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    const session = await verifySessionToken(token);
    const access = await getUserAccess(session.userId);
    if (!access || access.user.status !== 'ACTIVE') return null;

    return {
      ...session,
      userId: access.user.id,
      branchId: access.user.branchId,
      email: access.user.email,
      roles: access.roles.map((role) => role.name),
      permissions: access.permissions,
      scopes: access.scopes,
      permissionOverrides: access.permissionOverrides,
    };
  } catch {
    return null;
  }
}
