import { NextRequest } from 'next/server';
import { getAttendanceRecords, getAttendanceSections, summarizeAttendance } from '@/lib/attendance';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { hasPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'attendance.view')) return failure('Forbidden', 403);
  const [sections, records] = await Promise.all([getAttendanceSections(session.branchId), getAttendanceRecords(session.branchId)]);
  return success(summarizeAttendance(sections.find((section) => section.id === 'main-service')!, records));
}
