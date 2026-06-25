import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { hasPermission } from '@/lib/rbac';

function cleanAction(action: string) {
  return action.replaceAll('_', ' ').replaceAll('.', ' ').toLowerCase();
}

function describeAuditLog(log: { action: string; entity: string; entityId?: string | null }) {
  const entityName = log.entityId ?? log.entity;
  return `${cleanAction(log.action)} ${entityName}`.trim();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'auditLogs.viewDetails') && !hasPermission(session.permissions, 'auditLogs.view')) {
    return failure('Forbidden', 403);
  }

  const { id } = await params;
  const item = await prisma.auditLog.findFirst({
    where: { id, branchId: session.branchId },
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      oldValue: true,
      newValue: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!item) return failure('Audit log not found', 404);

  return success({
    id: item.id,
    actorName: item.user?.name ?? 'System',
    action: item.action,
    module: item.entity,
    entityType: item.entity,
    entityName: item.entityId ?? item.entity,
    description: describeAuditLog(item),
    createdAt: item.createdAt,
    beforeJson: item.oldValue,
    afterJson: item.newValue,
    metadataJson: {
      entityId: item.entityId,
      ipAddress: item.ipAddress,
      userAgent: item.userAgent,
      actorEmail: item.user?.email ?? null,
    },
  });
}
