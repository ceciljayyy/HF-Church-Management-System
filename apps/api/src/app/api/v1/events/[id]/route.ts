import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auditMetaFromRequest, createAuditLog, writeActivityLog } from '@/lib/audit';
import { failure, success } from '@/lib/http';
import { getAttendanceRecords } from '@/lib/attendance';
import { getRequestSession } from '@/lib/request-session';
import { hasPermission } from '@/lib/rbac';
import { invalidateDashboardCache } from '@/lib/cache-invalidation';

const eventTypes = ['SERVICE', 'MEETING', 'CONFERENCE', 'OUTREACH', 'YOUTH', 'OTHER'] as const;
const eventStatuses = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] as const;
const metadataKey = 'events.metadata';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  eventType: z.enum(eventTypes).optional(),
  description: z.string().optional().nullable(),
  eventDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  locationType: z.enum(['PHYSICAL', 'ONLINE', 'HYBRID']).optional(),
  physicalLocation: z.string().optional().nullable(),
  onlineLink: z.string().optional().nullable(),
  organizerName: z.string().optional().nullable(),
  isPublic: z.coerce.boolean().optional(),
  registrationRequired: z.coerce.boolean().optional(),
  repeatType: z.string().optional().nullable(),
  maxAttendees: z.coerce.number().int().nonnegative().optional().nullable(),
  department: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  status: z.enum(eventStatuses).optional(),
});

function combineDateTime(date: string, time: string) {
  const value = new Date(`${date}T${time}`);
  if (Number.isNaN(value.getTime())) throw new Error('Invalid event date or time.');
  return value;
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function timeOnly(value: Date) {
  return value.toISOString().slice(11, 16);
}

function statusFor(event: { status: string; startDateTime: Date; endDateTime: Date }) {
  if (event.status === 'CANCELLED') return 'CANCELLED';
  if (event.status === 'COMPLETED') return 'COMPLETED';
  const now = new Date();
  if (event.startDateTime <= now && event.endDateTime >= now) return 'ONGOING';
  if (event.endDateTime < now) return 'COMPLETED';
  return 'UPCOMING';
}

async function getMetadata(branchId: string) {
  const setting = await prisma.setting.findUnique({ where: { branchId_key: { branchId, key: metadataKey } } });
  return setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value)
    ? (setting.value as Record<string, any>)
    : {};
}

async function saveMetadata(branchId: string, metadata: Record<string, any>) {
  await prisma.setting.upsert({
    where: { branchId_key: { branchId, key: metadataKey } },
    update: { value: metadata as Prisma.InputJsonValue },
    create: { branchId, key: metadataKey, value: metadata as Prisma.InputJsonValue, type: 'JSON' },
  });
}

function mergeEvent(event: any, metadata: Record<string, any>) {
  const meta = metadata[event.id] ?? {};
  return {
    ...event,
    eventDate: dateOnly(event.startDateTime),
    startTime: timeOnly(event.startDateTime),
    endTime: timeOnly(event.endDateTime),
    displayStatus: statusFor(event),
    locationType: meta.locationType ?? 'PHYSICAL',
    physicalLocation: meta.physicalLocation ?? event.location ?? '',
    onlineLink: meta.onlineLink ?? '',
    organizerName: meta.organizerName ?? event.createdBy?.name ?? 'Church Admin',
    isPublic: meta.isPublic ?? true,
    registrationRequired: meta.registrationRequired ?? false,
    repeatType: meta.repeatType ?? 'NONE',
    maxAttendees: meta.maxAttendees ?? event.capacity ?? null,
    department: meta.department ?? '',
    tags: meta.tags ?? '',
  };
}

function attendanceStats(records: any[]) {
  const values = records.flatMap((record) => [record.values ?? {}]);
  const sum = (key: string) => values.reduce((total, item) => total + Number(item[key] ?? 0), 0);
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
  if (!hasPermission(session.permissions, 'events.view')) return failure('Forbidden', 403);
  const { id } = await context.params;
  const [event, metadata, attendance] = await Promise.all([
    prisma.event.findFirst({
      where: { id, branchId: session.branchId, deletedAt: null },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    }),
    getMetadata(session.branchId),
    getAttendanceRecords(session.branchId),
  ]);
  if (!event) return failure('Event not found', 404);
  const eventAttendance = attendance.filter((record) => record.eventId === id || record.serviceTitle === event.title);
  return success({ item: mergeEvent(event, metadata), attendance: eventAttendance, attendanceStats: attendanceStats(eventAttendance) });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'events.update')) return failure('Forbidden', 403);
    const { id } = await context.params;
    const existing = await prisma.event.findFirst({ where: { id, branchId: session.branchId, deletedAt: null } });
    if (!existing) return failure('Event not found', 404);
    const body = updateSchema.parse(await req.json());
    const eventDate = body.eventDate ?? dateOnly(existing.startDateTime);
    const startTime = body.startTime ?? timeOnly(existing.startDateTime);
    const endTime = body.endTime ?? timeOnly(existing.endDateTime);
    const startDateTime = combineDateTime(eventDate, startTime);
    const endDateTime = combineDateTime(eventDate, endTime);
    if (endDateTime <= startDateTime) return failure('End time must be after start time.', 422);

    const metadata = await getMetadata(session.branchId);
    const currentMeta = metadata[id] ?? {};
    const nextMeta = {
      ...currentMeta,
      locationType: body.locationType ?? currentMeta.locationType ?? 'PHYSICAL',
      physicalLocation: body.physicalLocation ?? currentMeta.physicalLocation ?? existing.location ?? '',
      onlineLink: body.onlineLink ?? currentMeta.onlineLink ?? '',
      organizerName: body.organizerName ?? currentMeta.organizerName ?? '',
      isPublic: body.isPublic ?? currentMeta.isPublic ?? true,
      registrationRequired: body.registrationRequired ?? currentMeta.registrationRequired ?? false,
      repeatType: body.repeatType ?? currentMeta.repeatType ?? 'NONE',
      maxAttendees: body.maxAttendees ?? currentMeta.maxAttendees ?? existing.capacity ?? null,
      department: body.department ?? currentMeta.department ?? '',
      tags: body.tags ?? currentMeta.tags ?? '',
    };
    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: body.title,
        eventType: body.eventType,
        description: body.description,
        startDateTime,
        endDateTime,
        location: nextMeta.locationType === 'ONLINE' ? nextMeta.onlineLink : nextMeta.physicalLocation,
        capacity: nextMeta.maxAttendees,
        status: body.status,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    metadata[id] = nextMeta;
    await saveMetadata(session.branchId, metadata);
    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'EVENT_UPDATED',
      entity: 'Event',
      entityId: id,
      module: 'Events',
      oldValue: existing as any,
      newValue: { ...updated, ...nextMeta } as any,
      details: { description: `Updated event ${updated.title}` },
      ...auditMetaFromRequest(req),
    });
    await invalidateDashboardCache(session.branchId);
    return success({ item: mergeEvent(updated, metadata) });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to update event', 500);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'events.cancel') && !hasPermission(session.permissions, 'events.delete')) {
    return failure('Forbidden', 403);
  }
  const { id } = await context.params;
  const existing = await prisma.event.findFirst({ where: { id, branchId: session.branchId, deletedAt: null } });
  if (!existing) return failure('Event not found', 404);
  const item = await prisma.event.update({ where: { id }, data: { status: 'CANCELLED' } });
  await createAuditLog({
    branchId: session.branchId,
    userId: session.userId,
    action: 'EVENT_CANCELLED',
    entity: 'Event',
    entityId: id,
    module: 'Events',
    oldValue: existing as any,
    newValue: item as any,
    details: { description: `Cancelled event ${item.title}` },
    ...auditMetaFromRequest(req),
  });
  await writeActivityLog({
    branchId: session.branchId,
    userId: session.userId,
    title: `Cancelled event ${item.title}`,
    description: `${item.title} was cancelled.`,
    type: 'EVENT_CANCELLED',
  });
  await invalidateDashboardCache(session.branchId);
  return success({ item });
}
