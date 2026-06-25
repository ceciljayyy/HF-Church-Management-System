import { NextRequest } from 'next/server';
import { z } from 'zod';
import { removedRoles } from '@church/shared';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { auditMetaFromRequest, writeAuditLog } from '@/lib/audit';
import { requirePermission } from '@/lib/access-control';
import { getAuthedSession } from '@/lib/people';

const roleSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
});

const roleUpdateSchema = roleSchema.partial().extend({
  id: z.string().cuid(),
  permissionKeys: z.array(z.string()).optional(),
});

const removedRoleSet = new Set<string>(removedRoles as readonly string[]);

function groupPermissions(items: Array<{ permission: { key: string; name?: string | null; module: string; description?: string | null } }>) {
  return items.reduce<Record<string, Array<{ key: string; name?: string | null; description?: string | null }>>>((acc, item) => {
    acc[item.permission.module] ??= [];
    acc[item.permission.module]!.push({
      key: item.permission.key,
      name: item.permission.name,
      description: item.permission.description,
    });
    return acc;
  }, {});
}

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'roles.view');
  if (denied) return denied;

  const items = await prisma.role.findMany({
    where: { name: { notIn: [...removedRoleSet] } },
    include: {
      permissions: {
        include: { permission: true },
        orderBy: { permission: { key: 'asc' } },
      },
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });

  return success({
    items: items.map((role) => ({
      ...role,
      permissionKeys: role.permissions.map((permission) => permission.permission.key),
      permissionsByModule: groupPermissions(role.permissions),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'roles.create');
  if (denied) return denied;

  try {
    const body = roleSchema.parse(await req.json());
    if (removedRoleSet.has(body.name)) return failure('This role is not allowed by the access-control policy.', 422);
    const item = await prisma.role.create({
      data: { name: body.name, description: body.description, isSystem: false },
    });
    await writeAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'role.created',
      entity: 'Role',
      entityId: item.id,
      newValue: { name: item.name },
      ...auditMetaFromRequest(req),
    });
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to create role', 500, error);
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'roles.update');
  if (denied) return denied;

  try {
    const body = roleUpdateSchema.parse(await req.json());
    const existing = await prisma.role.findUnique({ where: { id: body.id } });
    if (!existing) return failure('Role not found', 404);
    if (removedRoleSet.has(existing.name)) return failure('This role is not available.', 422);

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id: body.id },
        data: {
          name: existing.isSystem ? existing.name : body.name,
          description: body.description,
        },
      });

      if (body.permissionKeys) {
        const permissions = await tx.permission.findMany({
          where: { key: { in: body.permissionKeys } },
          select: { id: true },
        });
        await tx.rolePermission.deleteMany({ where: { roleId: body.id } });
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId: body.id, permissionId: permission.id })),
          skipDuplicates: true,
        });
      }

      return updated;
    });

    await writeAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'role.updated',
      entity: 'Role',
      entityId: item.id,
      newValue: { name: item.name, permissionCount: body.permissionKeys?.length },
      ...auditMetaFromRequest(req),
    });

    return success({ item });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to update role', 500, error);
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  const denied = await requirePermission(session.userId, 'roles.delete');
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return failure('Missing role id', 400);
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return failure('Role not found', 404);
  if (role.isSystem) return failure('System roles cannot be deleted.', 409);
  await prisma.role.delete({ where: { id } });
  return success({ deleted: true });
}
