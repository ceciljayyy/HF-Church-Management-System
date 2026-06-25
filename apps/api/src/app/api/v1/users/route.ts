import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { removedRoles } from '@church/shared';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { hashPassword } from '@/lib/auth';
import { auditMetaFromRequest, writeAuditLog } from '@/lib/audit';
import { requirePermission } from '@/lib/access-control';
import { getAuthedSession, requireBranchId } from '@/lib/people';

const scopeSchema = z.enum(['GLOBAL', 'DEPARTMENT', 'SELF', 'NONE']).default('GLOBAL');

const userSchema = z.object({
  personId: z.string().cuid().optional().nullable(),
  branchId: z.string().cuid().optional(),
  name: z.string().min(2),
  username: z.string().trim().min(2).optional().nullable(),
  email: z.string().email(),
  phone: z.string().trim().optional().nullable(),
  password: z.string().min(8),
  avatarUrl: z.string().url().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  mustChangePassword: z.boolean().default(true),
  roleId: z.string().cuid().optional(),
  scopeType: scopeSchema,
  scopeId: z.string().optional().nullable(),
});

const userUpdateSchema = userSchema.partial().extend({ id: z.string().cuid() });

const removedRoleSet = new Set<string>(removedRoles as readonly string[]);

function userSelect() {
  return {
    id: true,
    branchId: true,
    personId: true,
    name: true,
    username: true,
    email: true,
    phone: true,
    avatarUrl: true,
    mustChangePassword: true,
    status: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    branch: true,
    person: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
    roles: { include: { role: true } },
    permissionOverrides: { include: { permission: true } },
  } satisfies Prisma.UserSelect;
}

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'users.view');
  if (denied) return denied;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const search = url.searchParams.get('search')?.trim();
  const role = url.searchParams.get('role')?.trim();
  const status = url.searchParams.get('status')?.trim();

  if (id) {
    const item = await prisma.user.findUnique({
      where: { id },
      select: userSelect(),
    });
    if (!item) return failure('Record not found', 404);
    return success({ item });
  }

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(status ? { status: status as any } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(role ? { roles: { some: { role: { name: role } } } } : {}),
  };

  const items = await prisma.user.findMany({
    where,
    select: userSelect(),
    orderBy: { createdAt: 'desc' },
  });
  return success({ items });
}

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'users.create');
  if (denied) return denied;

  try {
    const body = userSchema.parse(await req.json());
    const branchId = body.branchId ?? (await requireBranchId(session.branchId));
    const person = body.personId
      ? await prisma.person.findFirst({
          where: { id: body.personId, branchId, deletedAt: null },
          select: { id: true, phone: true, email: true },
        })
      : null;

    if (body.personId && !person) return failure('Selected person was not found.', 404);

    if (body.personId) {
      const existingPersonUser = await prisma.user.findFirst({
        where: { personId: body.personId, deletedAt: null },
        select: { id: true },
      });
      if (existingPersonUser) return failure('This person already has platform access.', 409);
    }

    const role = body.roleId
      ? await prisma.role.findUnique({ where: { id: body.roleId } })
      : await prisma.role.findUnique({ where: { name: 'Viewer' } });
    if (!role || removedRoleSet.has(role.name)) return failure('Selected role is not available.', 422);
    if (role.name === 'Super Admin') {
      const canAssignSuperAdmin = await requirePermission(session.userId, 'permissions.override');
      if (canAssignSuperAdmin) return failure('Only Super Admin-level users can assign Super Admin.', 403);
    }

    const item = await prisma.$transaction(
      async (tx) => {
        const created = await tx.user.create({
          data: {
            branchId,
            personId: body.personId ?? null,
            name: body.name,
            username: body.username || null,
            email: body.email,
            phone: body.phone || person?.phone || null,
            passwordHash: await hashPassword(body.password),
            avatarUrl: body.avatarUrl,
            status: body.status ?? 'ACTIVE',
            mustChangePassword: body.mustChangePassword,
          },
        });

        await tx.userRole.create({
          data: {
            userId: created.id,
            roleId: role.id,
            scopeType: body.scopeType,
            scopeId: body.scopeType === 'DEPARTMENT' ? body.scopeId || null : null,
          },
        });

        await tx.auditLog.create({
          data: {
            branchId,
            userId: session.userId,
            action: 'user.access.created',
            entity: 'User',
            entityId: created.id,
            newValue: {
              personId: body.personId ?? null,
              role: role.name,
              scopeType: body.scopeType,
              scopeId: body.scopeId ?? null,
              mustChangePassword: body.mustChangePassword,
            },
            ...auditMetaFromRequest(req),
          },
        });

        return tx.user.findUnique({ where: { id: created.id }, select: userSelect() });
      },
      { maxWait: 15_000, timeout: 30_000 },
    );

    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return failure('A user with the same email, username, or linked person already exists.', 409, error.meta);
    }
    return failure('Unable to create user', 500, error);
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'users.update');
  if (denied) return denied;

  try {
    const body = userUpdateSchema.parse(await req.json());
    const item = await prisma.user.update({
      where: { id: body.id },
      data: {
        branchId: body.branchId,
        personId: body.personId,
        name: body.name,
        username: body.username,
        email: body.email,
        phone: body.phone,
        avatarUrl: body.avatarUrl,
        status: body.status,
        mustChangePassword: body.mustChangePassword,
        ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}),
      },
      select: userSelect(),
    });

    await writeAuditLog({
      branchId: item.branchId,
      userId: session.userId,
      action: body.password ? 'user.password.reset' : 'user.updated',
      entity: 'User',
      entityId: item.id,
      newValue: { status: item.status, mustChangePassword: item.mustChangePassword },
      ...auditMetaFromRequest(req),
    });

    return success({ item });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to update user', 500, error);
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'users.deactivate');
  if (denied) return denied;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return failure('Missing id', 400);

  const item = await prisma.user.update({
    where: { id },
    data: { status: 'ARCHIVED', deletedAt: new Date() },
    select: userSelect(),
  });

  await writeAuditLog({
    branchId: item.branchId,
    userId: session.userId,
    action: 'user.deactivated',
    entity: 'User',
    entityId: id,
    newValue: { status: 'ARCHIVED' },
    ...auditMetaFromRequest(req),
  });

  return success({ item });
}
