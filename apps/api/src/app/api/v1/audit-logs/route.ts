import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(Math.floor(parsed), 1);
}

function cleanAction(action: string) {
  return action.replaceAll('_', ' ').replaceAll('.', ' ').toLowerCase();
}

function describeAuditLog(log: { action: string; entity: string; entityId?: string | null }) {
  const entityName = log.entityId ?? log.entity;
  return `${cleanAction(log.action)} ${entityName}`.trim();
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);

  const url = new URL(req.url);
  const page = parsePositiveInteger(url.searchParams.get('page'), 1);
  const limit = Math.min(parsePositiveInteger(url.searchParams.get('limit'), 20), 100);
  const search = url.searchParams.get('search')?.trim();
  const action = url.searchParams.get('action')?.trim();
  const entity = url.searchParams.get('entity')?.trim();
  const userId = url.searchParams.get('userId')?.trim();
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const where: Prisma.AuditLogWhereInput = {
    branchId: session.branchId,
  };

  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (entity) where.entity = { contains: entity, mode: 'insensitive' };
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { entity: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return success({
    items: items.map((item) => ({
      id: item.id,
      actorName: item.user?.name ?? 'System',
      action: item.action,
      module: item.entity,
      entityType: item.entity,
      entityName: item.entityId ?? item.entity,
      description: describeAuditLog(item),
      createdAt: item.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
