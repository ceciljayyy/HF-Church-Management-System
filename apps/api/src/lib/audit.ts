import { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';
import { prisma } from './prisma';

type AuditEntry = {
  branchId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(entry: AuditEntry) {
  return prisma.auditLog.create({
    data: {
      ...entry,
      oldValue: entry.oldValue === null ? Prisma.JsonNull : entry.oldValue,
      newValue: entry.newValue === null ? Prisma.JsonNull : entry.newValue,
    },
  });
}

export async function createAuditLog(
  entry: AuditEntry & {
    module?: string;
    details?: Prisma.InputJsonValue | null;
  },
) {
  const newValue =
    entry.details || entry.module
      ? {
          module: entry.module ?? entry.entity,
          details: entry.details ?? null,
          value: entry.newValue ?? null,
        }
      : entry.newValue;

  return writeAuditLog({
    branchId: entry.branchId,
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    oldValue: entry.oldValue,
    newValue,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  });
}

export function auditMetaFromRequest(req: NextRequest) {
  return {
    ipAddress: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  };
}

export async function writeActivityLog(entry: {
  branchId: string;
  userId?: string | null;
  title: string;
  description?: string | null;
  type: string;
}) {
  return prisma.activityLog.create({ data: entry });
}
