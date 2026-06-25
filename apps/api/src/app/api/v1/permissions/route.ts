import { NextRequest, NextResponse } from 'next/server';
import { permissionCatalog } from '@church/shared';
import { getAuthedSession } from '@/lib/people';
import { hasPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'roles.view') && !hasPermission(session.permissions, 'permissions.override')) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ success: true, data: { items: permissionCatalog } });
}
