import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export async function writeAuditLog(entry: {
  branchId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      ...entry,
      oldValue: entry.oldValue === null ? Prisma.JsonNull : entry.oldValue,
      newValue: entry.newValue === null ? Prisma.JsonNull : entry.newValue,
    },
  });
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
