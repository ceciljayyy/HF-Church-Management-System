import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AttendanceRecord, calculateAttendanceTotal, getAttendanceRecords, getAttendanceSections, saveAttendanceRecords } from '@/lib/attendance';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

const recordSchema = z.object({
  sectionId: z.string().min(1),
  serviceTitle: z.string().min(1),
  attendanceDate: z.string().min(1),
  values: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().optional(),
  recordedByName: z.string().optional(),
});

async function getSession(req: NextRequest) {
  return getRequestSession(req);
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'attendance.view')) return failure('Forbidden', 403);
  const url = new URL(req.url);
  const sourceType = url.searchParams.get('sourceType');
  const eventId = url.searchParams.get('eventId');
  const records = await getAttendanceRecords(session.branchId);
  return success({
    items: records.filter((record) => {
      if (sourceType && record.sourceType !== sourceType) return false;
      if (eventId && record.eventId !== eventId) return false;
      return true;
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'attendance.record')) return failure('Forbidden', 403);
    const body = recordSchema.parse(await req.json());
    const sections = await getAttendanceSections(session.branchId);
    const section = sections.find((item) => item.id === body.sectionId || item.slug === body.sectionId);
    if (!section) return failure('Attendance section is required.', 422);

    for (const field of section.fields) {
      if (field.required && (body.values[field.key] === undefined || body.values[field.key] === '')) {
        return failure(`${field.label} is required.`, 422);
      }
      if (field.type === 'number' && Number(body.values[field.key] ?? 0) < 0) {
        return failure(`${field.label} must be 0 or higher.`, 422);
      }
    }

    const now = new Date().toISOString();
    const item: AttendanceRecord = {
      id: `att-${Date.now().toString(36)}`,
      sectionId: section.id,
      sectionName: section.name,
      sectionSlug: section.slug,
      serviceTitle: body.serviceTitle,
      attendanceDate: new Date(body.attendanceDate).toISOString(),
      values: body.values,
      total: calculateAttendanceTotal(section, body.values),
      notes: body.notes,
      recordedById: session.userId,
      recordedByName: body.recordedByName,
      createdAt: now,
      updatedAt: now,
    };
    const records = await getAttendanceRecords(session.branchId);
    await saveAttendanceRecords(session.branchId, [item, ...records]);
    await prisma.activityLog.create({
      data: {
        branchId: session.branchId,
        userId: session.userId,
        title: `${section.name} attendance recorded`,
        description: `${item.total} total for ${item.serviceTitle}.`,
        type: 'ATTENDANCE_RECORD',
      },
    });
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to record attendance', 500);
  }
}
