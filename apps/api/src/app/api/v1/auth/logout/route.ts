import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';
import { getRequestSession } from '@/lib/request-session';
import { buildClearedCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (session) {
    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: session.userId,
      module: 'auth',
      newValue: { message: 'User logged out' },
      ...auditMetaFromRequest(req),
    });
  }

  const response = NextResponse.json({
    success: true,
    data: { success: true },
  });
  response.cookies.set(buildClearedCookie());
  return response;
}
