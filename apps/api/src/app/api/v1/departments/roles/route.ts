import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);

  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
  const role = url.searchParams.get('role');
  const search = url.searchParams.get('search')?.trim() ?? '';
  const where: any = {
    group: { branchId: session.branchId, type: 'DEPARTMENT', deletedAt: null },
  };

  if (role === 'HEAD' || role === 'MEMBER') where.role = role;
  if (search) {
    where.OR = [
      { status: { contains: search, mode: 'insensitive' } },
      { person: { firstName: { contains: search, mode: 'insensitive' } } },
      { person: { lastName: { contains: search, mode: 'insensitive' } } },
      { group: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [items, total, departments] = await Promise.all([
    prisma.groupMember.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ group: { name: 'asc' } }, { role: 'asc' }, { joinedAt: 'asc' }],
      include: { person: true, group: true },
    }),
    prisma.groupMember.count({ where }),
    prisma.group.findMany({ where: { branchId: session.branchId, type: 'DEPARTMENT', deletedAt: null }, orderBy: { name: 'asc' } }),
  ]);

  return success({ items, departments, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}
