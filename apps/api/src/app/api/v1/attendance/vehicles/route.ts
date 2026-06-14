import { NextRequest } from 'next/server';
import { getAttendanceRecords, getAttendanceSections, summarizeAttendance } from '@/lib/attendance';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return failure('Unauthorized', 401);
  const session = await verifySessionToken(token);
  const [sections, records] = await Promise.all([getAttendanceSections(session.branchId), getAttendanceRecords(session.branchId)]);
  return success(summarizeAttendance(sections.find((section) => section.id === 'vehicles')!, records));
}
