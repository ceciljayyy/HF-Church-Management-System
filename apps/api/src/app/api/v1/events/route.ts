import { NextRequest } from 'next/server';
import { Prisma, type EventStatus, type EventType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auditMetaFromRequest, createAuditLog, writeActivityLog } from '@/lib/audit';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { hasPermission } from '@/lib/rbac';
import { invalidateDashboardCache } from '@/lib/cache-invalidation';

const eventTypes = ['SERVICE', 'MEETING', 'CONFERENCE', 'OUTREACH', 'YOUTH', 'OTHER'] as const;
const eventStatuses = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] as const;

const eventSchema = z.object({
  title: z.string().min(1, 'Event name is required.'),
  eventType: z.enum(eventTypes).default('SERVICE'),
  description: z.string().optional().nullable(),
  eventDate: z.string().min(1, 'Event date is required.'),
  startTime: z.string().min(1, 'Start time is required.'),
  endTime: z.string().min(1, 'End time is required.'),
  locationType: z.enum(['PHYSICAL', 'ONLINE', 'HYBRID']).default('PHYSICAL'),
  physicalLocation: z.string().optional().nullable(),
  onlineLink: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  organizerName: z.string().optional().nullable(),
  isPublic: z.coerce.boolean().default(true),
  registrationRequired: z.coerce.boolean().default(false),
  repeatType: z.string().optional().nullable(),
  maxAttendees: z.coerce.number().int().nonnegative().optional().nullable(),
  department: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  status: z.enum(eventStatuses).default('PUBLISHED'),
});

const metadataKey = 'events.metadata';

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

function statusFor(event: { status: EventStatus; startDateTime: Date; endDateTime: Date }) {
  if (event.status === 'CANCELLED') return 'CANCELLED';
  if (event.status === 'COMPLETED') return 'COMPLETED';
  const now = new Date();
  if (event.startDateTime <= now && event.endDateTime >= now) return 'ONGOING';
  if (event.endDateTime < now) return 'COMPLETED';
  return 'UPCOMING';
}

function metadataFromBody(body: z.infer<typeof eventSchema>, fallbackOrganizer: string) {
  const physicalLocation = body.physicalLocation || body.location || '';
  const onlineLink = body.onlineLink || '';
  return {
    locationType: body.locationType,
    physicalLocation,
    onlineLink,
    organizerName: body.organizerName || fallbackOrganizer,
    isPublic: body.isPublic,
    registrationRequired: body.registrationRequired,
    repeatType: body.repeatType || 'NONE',
    maxAttendees: body.maxAttendees ?? null,
    department: body.department || '',
    tags: body.tags || '',
  };
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
  const locationType = meta.locationType ?? 'PHYSICAL';
  return {
    ...event,
    eventDate: dateOnly(event.startDateTime),
    startTime: timeOnly(event.startDateTime),
    endTime: timeOnly(event.endDateTime),
    displayStatus: statusFor(event),
    locationType,
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

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'events.view')) return failure('Forbidden', 403);

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
  const search = url.searchParams.get('search')?.trim();
  const type = url.searchParams.get('type') as EventType | null;
  const status = url.searchParams.get('status') as EventStatus | null;
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const where: Prisma.EventWhereInput = { branchId: session.branchId, deletedAt: null };
  if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { location: { contains: search, mode: 'insensitive' } }];
  if (type && eventTypes.includes(type as any)) where.eventType = type;
  if (status && eventStatuses.includes(status as any)) where.status = status;
  if (startDate || endDate) {
    where.startDateTime = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(`${endDate}T23:59:59`) } : {}),
    };
  }

  const [events, total, metadata] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true, email: true } } },
      orderBy: { startDateTime: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.count({ where }),
    getMetadata(session.branchId),
  ]);

  const items = events.map((event) => mergeEvent(event, metadata));
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const all = await prisma.event.findMany({ where: { branchId: session.branchId, deletedAt: null } });
  const allMerged = all.map((event) => mergeEvent(event, metadata));

  return success({
    items,
    summary: {
      upcomingEvents: allMerged.filter((event) => event.displayStatus === 'UPCOMING').length,
      eventsThisMonth: all.filter((event) => event.startDateTime >= startOfMonth && event.startDateTime <= endOfMonth).length,
      publicEvents: allMerged.filter((event) => event.isPublic).length,
      registrationEvents: allMerged.filter((event) => event.registrationRequired).length,
      averageAttendance: 0,
    },
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'events.create')) return failure('Forbidden', 403);
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    const body = eventSchema.parse(await req.json());
    const startDateTime = combineDateTime(body.eventDate, body.startTime);
    const endDateTime = combineDateTime(body.eventDate, body.endTime);
    if (endDateTime <= startDateTime) return failure('End time must be after start time.', 422);
    const meta = metadataFromBody(body, user?.name ?? 'Church Admin');

    const item = await prisma.event.create({
      data: {
        branchId: session.branchId,
        title: body.title,
        description: body.description || null,
        eventType: body.eventType,
        startDateTime,
        endDateTime,
        location: body.locationType === 'ONLINE' ? meta.onlineLink : meta.physicalLocation,
        capacity: body.maxAttendees ?? null,
        status: body.status,
        createdById: session.userId,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    const metadata = await getMetadata(session.branchId);
    metadata[item.id] = meta;
    await saveMetadata(session.branchId, metadata);
    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'EVENT_CREATED',
      entity: 'Event',
      entityId: item.id,
      module: 'Events',
      newValue: { ...item, ...meta } as any,
      details: { description: `Created event ${item.title}` },
      ...auditMetaFromRequest(req),
    });
    await writeActivityLog({
      branchId: session.branchId,
      userId: session.userId,
      title: `Created event ${item.title}`,
      description: `${item.title} scheduled for ${startDateTime.toLocaleString()}.`,
      type: 'EVENT_CREATED',
    });
    await invalidateDashboardCache(session.branchId);

    return success({ item: mergeEvent(item, metadata) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to create event', 500);
  }
}
