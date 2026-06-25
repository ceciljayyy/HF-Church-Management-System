import { NextRequest } from 'next/server';
import { buildAttendanceOverview } from '@/lib/attendance';
import { getCacheVersion, getOrSetCache } from '@/lib/cache';
import { cacheKeys } from '@/lib/cache-keys';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { hasPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'attendance.view')) return failure('Forbidden', 403);
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
