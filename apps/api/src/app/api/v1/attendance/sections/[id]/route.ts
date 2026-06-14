import { NextRequest } from 'next/server';
import { getAttendanceRecords, getAttendanceSections, saveCustomAttendanceSections, summarizeAttendance } from '@/lib/attendance';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

async function getSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  const { id } = await context.params;
  const [sections, records] = await Promise.all([getAttendanceSections(session.branchId), getAttendanceRecords(session.branchId)]);
  const section = sections.find((item) => item.id === id || item.slug === id);
  if (!section) return failure('Attendance section not found', 404);
  return success(summarizeAttendance(section, records));
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  const { id } = await context.params;
  const body = await req.json();
  const sections = await getAttendanceSections(session.branchId);
  const custom = sections.filter((section) => !section.isDefault);
  const existing = custom.find((section) => section.id === id || section.slug === id);
  if (!existing) return failure('Attendance section not found', 404);
  const updated = { ...existing, ...body, isDefault: false, updatedAt: new Date().toISOString() };
  await saveCustomAttendanceSections(session.branchId, custom.map((section) => section.id === existing.id ? updated : section));
  return success({ item: updated });
}
