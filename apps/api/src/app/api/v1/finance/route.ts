import { NextRequest } from 'next/server';
import { getFinanceOverview } from '@/lib/finance';
import { getRequestSession } from '@/lib/request-session';
import { failure, success } from '@/lib/http';
import { hasPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'finance.view')) return failure('Forbidden', 403);
    return success(await getFinanceOverview(session.branchId));
  } catch {
    return failure('Unauthorized', 401);
  }
}
