import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { createPersonSchema, peopleQuerySchema } from '@church/shared';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { hasPermission } from '@/lib/rbac';
import { writeAuditLog, writeActivityLog } from '@/lib/audit';
import { getCacheVersion, getOrSetCache } from '@/lib/cache';
import { cacheKeys } from '@/lib/cache-keys';
import { invalidatePeopleCache } from '@/lib/cache-invalidation';
import {
  auditPersonCreate,
  canCreatePeople,
  canReadPeople,
  createPersonWithMembership,
  getAuthedSession,
  normalizeDate,
  normalizeEmail,
  normalizeFullName,
  normalizePhone,
  requireBranchId,
} from '@/lib/people';

const updatePersonSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').optional(),
  lastName: z.string().trim().min(1, 'Last name is required').optional(),
  email: z
    .preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      z.string().email().nullable().optional(),
    ),
  mobilePhone: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  dateOfBirth: z.string().trim().optional().nullable(),
  classification: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

async function findPersonDuplicate(input: { firstName?: string; lastName?: string; gender?: string | null; email?: string | null; phone?: string | null; mobilePhone?: string | null; dateOfBirth?: string | null }, branchId: string, excludeId?: string) {
  const people = await prisma.person.findMany({
    where: { branchId, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, firstName: true, lastName: true, gender: true, email: true, phone: true, mobilePhone: true, dateOfBirth: true },
  });
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.mobilePhone ?? input.phone);
  const fullName = normalizeFullName(input.firstName, input.lastName);
  const genderKey = fullName && input.gender ? `${fullName}:${input.gender.toLowerCase()}` : null;
  const dobKey = fullName && input.dateOfBirth ? `${fullName}:${normalizeDate(input.dateOfBirth)}` : null;

  return people.find((person) => {
    const personName = normalizeFullName(person.firstName, person.lastName);
    return (
      (email && normalizeEmail(person.email) === email) ||
      (phone && [person.phone, person.mobilePhone].some((value) => normalizePhone(value) === phone)) ||
      (fullName && personName === fullName) ||
      (genderKey && personName && person.gender && `${personName}:${String(person.gender).toLowerCase()}` === genderKey) ||
      (dobKey && personName && `${personName}:${normalizeDate(person.dateOfBirth)}` === dobKey)
    );
  });
}

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canReadPeople(session.permissions)) return failure('Forbidden', 403);

  try {
    const url = new URL(req.url);
    const query = peopleQuerySchema.parse(Object.fromEntries(url.searchParams));
    const branchId = await requireBranchId(session.branchId);
    const where: any = {};

    if (query.status?.toLowerCase() === 'archived') {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    where.branchId = branchId;

    if (query.search) {
      where.OR = ['firstName', 'middleName', 'lastName', 'email', 'phone', 'mobilePhone'].map((field) => ({
        [field]: { contains: query.search, mode: 'insensitive' },
      }));
    }

    if (query.classification) {
      where.classification = { equals: query.classification, mode: 'insensitive' };
    }

    const params = {
      page: query.page,
      limit: query.limit,
      status: query.status ?? 'active',
      search: query.search ?? '',
      classification: query.classification ?? '',
    };
    const version = await getCacheVersion(cacheKeys.peopleVersion(branchId));

    const [items, total] = await Promise.all([
      getOrSetCache<any[]>(
        cacheKeys.peopleList(branchId, version, params),
        120,
        () =>
          prisma.person.findMany({
            where,
            include: {
              member: true,
              familyMembers: { include: { family: true }, take: 1 },
            },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            orderBy: { createdAt: 'desc' },
          }) as any,
      ),
      getOrSetCache<number>(
        cacheKeys.peopleCount(branchId, version, params),
        120,
        () => prisma.person.count({ where }) as any,
      ),
    ]);

    return success({
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to load people', 500, error);
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canCreatePeople(session.permissions)) return failure('Forbidden', 403);

  try {
    const input = createPersonSchema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    const duplicate = await findPersonDuplicate(input, branchId);
    if (duplicate) return failure('Duplicate person detected. Review the existing person before saving.', 409, { personId: duplicate.id });
    const person = await createPersonWithMembership(input, branchId);
    const sideEffects = await Promise.allSettled([
      auditPersonCreate(req, branchId, session.userId, person),
      invalidatePeopleCache(branchId),
    ]);
    sideEffects.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(index === 0 ? 'People create audit log failed' : 'People create cache invalidation failed', result.reason);
      }
    });
    return success({ item: person }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return failure('A person with the same unique field already exists.', 409, error.meta);
    }
    return failure('Unable to create person', 500, error);
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'people.update')) return failure('Forbidden', 403);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return failure('Missing person id', 400);

    const branchId = await requireBranchId(session.branchId);
    const existing = await prisma.person.findFirst({ where: { id, branchId } });
    if (!existing) return failure('Person not found', 404);

    const input = updatePersonSchema.parse(await req.json());
    const duplicate = await findPersonDuplicate(
      {
        firstName: input.firstName ?? existing.firstName,
        lastName: input.lastName ?? existing.lastName,
        gender: existing.gender,
        email: input.email ?? existing.email,
        phone: input.phone ?? existing.phone,
        mobilePhone: input.mobilePhone ?? existing.mobilePhone,
        dateOfBirth: input.dateOfBirth ?? (existing.dateOfBirth ? existing.dateOfBirth.toISOString().slice(0, 10) : null),
      },
      branchId,
      id,
    );
    if (duplicate) return failure('Duplicate person detected. Review the existing person before saving.', 409, { personId: duplicate.id });
    const updated = await prisma.person.update({
      where: { id },
      data: {
        ...input,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : input.dateOfBirth === null ? null : existing.dateOfBirth,
        phone: input.mobilePhone ?? input.phone ?? existing.phone,
      },
      include: {
        member: true,
        familyMembers: { include: { family: true }, take: 1 },
      },
    });

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'update',
      entity: 'Person',
      entityId: id,
      oldValue: { id, email: existing.email, classification: existing.classification },
      newValue: { id, email: updated.email, classification: updated.classification },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    await invalidatePeopleCache(branchId);
    return success({ item: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to update person', 500, error);
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'people.delete')) return failure('Forbidden', 403);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const mode = url.searchParams.get('mode') ?? 'archive';
    if (!id) return failure('Missing person id', 400);

    const branchId = await requireBranchId(session.branchId);
    const existing = await prisma.person.findFirst({ where: { id, branchId } });
    if (!existing) return failure('Person not found', 404);

    if (mode === 'delete') {
      await prisma.person.delete({ where: { id } });
      await writeAuditLog({
        branchId,
        userId: session.userId,
        action: 'delete',
        entity: 'Person',
        entityId: id,
        oldValue: { id, email: existing.email, classification: existing.classification },
        ipAddress: req.headers.get('x-forwarded-for'),
        userAgent: req.headers.get('user-agent'),
      });
      await invalidatePeopleCache(branchId);
      return success({ deleted: true });
    }

    const archived = await prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'archive',
      entity: 'Person',
      entityId: id,
      oldValue: { id, deletedAt: existing.deletedAt },
      newValue: { id, deletedAt: archived.deletedAt },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    await writeActivityLog({
      branchId,
      userId: session.userId,
      title: 'Person archived',
      description: `${existing.firstName} ${existing.lastName} was archived.`,
      type: 'people.archive',
    });

    await invalidatePeopleCache(branchId);
    return success({ item: archived });
  } catch (error) {
    return failure('Unable to remove person', 500, error);
  }
}
