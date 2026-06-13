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

function clean(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const status = url.searchParams.get('status')?.trim();
  const where: any = { branchId: session.branchId, type: 'DEPARTMENT', deletedAt: null };

  if (status) where.status = status;
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];

  if (id) {
    const item = await prisma.group.findFirst({
      where: { id, branchId: session.branchId, type: 'DEPARTMENT', deletedAt: null },
      include: {
        leader: true,
        members: {
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          include: { person: true },
        },
      },
    });
    if (!item) return failure('Department not found', 404);
    return success({ item });
  }

  const [items, total] = await Promise.all([
    prisma.group.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        leader: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.group.count({ where }),
  ]);

  return success({ items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  const body = await parseJson(req);
  const name = clean(body.name);
  if (!name) return failure('Department name is required');

  const item = await prisma.group.create({
    data: {
      branchId: session.branchId,
      name,
      type: 'DEPARTMENT',
      description: clean(body.description),
      meetingDay: clean(body.leaderTitle),
      status: body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    },
  });

  return success({ item }, 201);
}

export async function PATCH(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return failure('Missing department id');

  const existing = await prisma.group.findFirst({ where: { id, branchId: session.branchId, type: 'DEPARTMENT' } });
  if (!existing) return failure('Department not found', 404);

  const body = await parseJson(req);
  const item = await prisma.group.update({
    where: { id },
    data: {
      name: clean(body.name) ?? existing.name,
      description: clean(body.description),
      meetingDay: clean(body.leaderTitle),
      status: body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    },
  });

  return success({ item });
}
