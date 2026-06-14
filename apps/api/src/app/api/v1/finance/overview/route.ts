import { NextRequest } from 'next/server';
import { getFinanceOverview } from '@/lib/finance';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return failure('Unauthorized', 401);
    const session = await verifySessionToken(token);
    return success(await getFinanceOverview(session.branchId));
  } catch {
    return failure('Unauthorized', 401);
  }
}
