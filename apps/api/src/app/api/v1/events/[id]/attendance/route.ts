import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auditMetaFromRequest, createAuditLog, writeActivityLog } from '@/lib/audit';
import { AttendanceRecord, getAttendanceRecords, saveAttendanceRecords } from '@/lib/attendance';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';

const attendanceSchema = z.object({
  men: z.coerce.number().nonnegative().default(0),
  women: z.coerce.number().nonnegative().default(0),
  boys: z.coerce.number().nonnegative().default(0),
  girls: z.coerce.number().nonnegative().default(0),
  cars: z.coerce.number().nonnegative().default(0),
  bicycles: z.coerce.number().nonnegative().default(0),
  motors: z.coerce.number().nonnegative().default(0),
  onlineAttendees: z.coerce.number().nonnegative().default(0),
  firstTimers: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
  recordedByName: z.string().optional().nullable(),
  attendanceDate: z.string().optional().nullable(),
});

function stats(records: AttendanceRecord[]) {
  const sum = (key: string) => records.reduce((total, record) => total + Number(record.values?.[key] ?? 0), 0);
  return {
    totalPeople: records.reduce((total, record) => total + Number(record.total ?? 0), 0),
    adults: sum('men') + sum('women'),
    children: sum('boys') + sum('girls'),
    vehicles: sum('cars') + sum('bicycles') + sum('motors'),
    firstTimers: sum('firstTimers'),
    onlineAttendees: sum('onlineAttendees'),
    men: sum('men'),
    women: sum('women'),
    boys: sum('boys'),
    girls: sum('girls'),
    cars: sum('cars'),
    bicycles: sum('bicycles'),
    motors: sum('motors'),
  };
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  const { id } = await context.params;
  const event = await prisma.event.findFirst({ where: { id, branchId: session.branchId, deletedAt: null } });
  if (!event) return failure('Event not found', 404);
  const items = (await getAttendanceRecords(session.branchId)).filter((record) => record.eventId === id);
  return success({ items, stats: stats(items) });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    const { id } = await context.params;
    const event = await prisma.event.findFirst({ where: { id, branchId: session.branchId, deletedAt: null } });
    if (!event) return failure('Event not found', 404);
    const body = attendanceSchema.parse(await req.json());
    const totalPeople = body.men + body.women + body.boys + body.girls + body.onlineAttendees;
    const totalVehicles = body.cars + body.bicycles + body.motors;
    if (totalPeople + totalVehicles + body.firstTimers <= 0) return failure('Enter at least one attendance value.', 422);

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    const now = new Date().toISOString();
    const item: AttendanceRecord = {
      id: `event-att-${Date.now().toString(36)}`,
      sectionId: 'event',
      sectionName: 'Event',
      sectionSlug: 'event',
      sourceType: 'Event',
      eventId: id,
      serviceTitle: event.title,
      attendanceDate: new Date(body.attendanceDate || event.startDateTime).toISOString(),
      values: {
        men: body.men,
        women: body.women,
        boys: body.boys,
        girls: body.girls,
        onlineAttendees: body.onlineAttendees,
        firstTimers: body.firstTimers,
        cars: body.cars,
        bicycles: body.bicycles,
        motors: body.motors,
      },
      total: totalPeople,
      totalVehicles,
      notes: body.notes || undefined,
      recordedById: session.userId,
      recordedByName: body.recordedByName || user?.name || 'Church Admin',
      createdAt: now,
      updatedAt: now,
    };

    const records = await getAttendanceRecords(session.branchId);
    await saveAttendanceRecords(session.branchId, [item, ...records]);
    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'EVENT_ATTENDANCE_RECORDED',
      entity: 'EventAttendance',
      entityId: item.id,
      module: 'Events',
      newValue: item as any,
      details: { description: `Recorded attendance for ${event.title}` },
      ...auditMetaFromRequest(req),
    });
    await writeActivityLog({
      branchId: session.branchId,
      userId: session.userId,
      title: `Recorded attendance for ${event.title}`,
      description: `${totalPeople} people and ${totalVehicles} vehicles.`,
      type: 'EVENT_ATTENDANCE',
    });

    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to record event attendance', 500);
  }
}

