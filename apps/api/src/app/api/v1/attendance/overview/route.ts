import { NextRequest } from 'next/server';
import { buildAttendanceOverview } from '@/lib/attendance';
import { getCacheVersion, getOrSetCache } from '@/lib/cache';
import { cacheKeys } from '@/lib/cache-keys';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return failure('Unauthorized', 401);
    const session = await verifySessionToken(token);
    const version = await getCacheVersion(cacheKeys.attendanceVersion(session.branchId));
    const overview = await getOrSetCache(
      cacheKeys.attendanceOverview(session.branchId, version),
      300,
      () => buildAttendanceOverview(session.branchId) as any,
    );
    return success(overview);
  } catch {
    return failure('Unable to load attendance overview', 500);
  }
}
