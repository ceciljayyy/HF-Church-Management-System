import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';

async function parseJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function roleType(value: unknown) {
  return value === 'HEAD' ? 'HEAD' : 'MEMBER';
}

function clean(value: unknown, fallback = 'Member') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

async function assertDepartment(id: string, branchId: string) {
  return prisma.group.findFirst({ where: { id, branchId, type: 'DEPARTMENT', deletedAt: null } });
}

async function syncLeader(groupId: string, personId: string | null, role: string, branchId: string) {
  if (role !== 'HEAD' || !personId) return;
  await prisma.groupMember.updateMany({ where: { groupId, role: 'HEAD', personId: { not: personId } }, data: { role: 'MEMBER' } });
  await prisma.group.update({ where: { id: groupId }, data: { leaderId: personId } });
  await prisma.group.updateMany({ where: { branchId, type: 'DEPARTMENT', leaderId: personId, id: { not: groupId } }, data: { leaderId: null } });
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  const body = await parseJson(req);
  const groupId = clean(body.departmentId, '');
  const personId = clean(body.personId, '');
  if (!groupId || !personId) return failure('Department and person are required');

  const department = await assertDepartment(groupId, session.branchId);
  if (!department) return failure('Department not found', 404);

  const person = await prisma.person.findFirst({ where: { id: personId, branchId: session.branchId, deletedAt: null } });
  if (!person) return failure('Person not found', 404);

  const role = roleType(body.roleType);
  const item = await prisma.groupMember.upsert({
    where: { groupId_personId: { groupId, personId } },
    update: { role, status: clean(body.position) },
    create: { groupId, personId, role, status: clean(body.position) },
    include: { person: true, group: true },
  });
  await syncLeader(groupId, personId, role, session.branchId);

  return success({ item }, 201);
}

export async function PATCH(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return failure('Missing membership id');

  const existing = await prisma.groupMember.findFirst({
    where: { id, group: { branchId: session.branchId, type: 'DEPARTMENT' } },
    include: { group: true },
  });
  if (!existing) return failure('Membership not found', 404);

  const body = await parseJson(req);
  const nextGroupId = clean(body.departmentId, existing.groupId);
  const department = await assertDepartment(nextGroupId, session.branchId);
  if (!department) return failure('Department not found', 404);

  const role = roleType(body.roleType);
  if (nextGroupId !== existing.groupId) {
    const duplicate = await prisma.groupMember.findUnique({ where: { groupId_personId: { groupId: nextGroupId, personId: existing.personId } } });
    if (duplicate) return failure('This person already belongs to the new department');
  }

  const item = await prisma.groupMember.update({
    where: { id },
    data: { groupId: nextGroupId, role, status: clean(body.position) },
    include: { person: true, group: true },
  });

  if (existing.role === 'HEAD' && existing.groupId !== nextGroupId) {
    await prisma.group.update({ where: { id: existing.groupId }, data: { leaderId: null } });
  }
  await syncLeader(nextGroupId, existing.personId, role, session.branchId);

  return success({ item });
}

export async function DELETE(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return failure('Missing membership id');

  const existing = await prisma.groupMember.findFirst({
    where: { id, group: { branchId: session.branchId, type: 'DEPARTMENT' } },
  });
  if (!existing) return failure('Membership not found', 404);

  await prisma.groupMember.delete({ where: { id } });
  if (existing.role === 'HEAD') await prisma.group.update({ where: { id: existing.groupId }, data: { leaderId: null } });

  return success({ deleted: true });
}
