import { NextRequest } from 'next/server';
import { buildAttendanceOverview } from '@/lib/attendance';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return failure('Unauthorized', 401);
    const session = await verifySessionToken(token);
    return success(await buildAttendanceOverview(session.branchId));
  } catch {
    return failure('Unable to load attendance overview', 500);
  }
}
