import { NextRequest } from 'next/server';
import { failure, success } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { getAuthedSession, requireBranchId } from '@/lib/people';
import { hasPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'communications.viewHistory')) return failure('Forbidden', 403);

  const branchId = await requireBranchId(session.branchId);
  const params = req.nextUrl.searchParams;
  const items = await prisma.communicationLog.findMany({
    where: {
      branchId,
      ...(params.get('channel') ? { channel: params.get('channel') as any } : {}),
      ...(params.get('purpose') ? { purpose: params.get('purpose') as any } : {}),
      ...(params.get('status') ? { status: params.get('status') as any } : {}),
      ...(params.get('personId') ? { recipientPersonId: params.get('personId') } : {}),
      ...(params.get('dateFrom') || params.get('dateTo')
        ? {
            createdAt: {
              ...(params.get('dateFrom') ? { gte: new Date(params.get('dateFrom')!) } : {}),
              ...(params.get('dateTo') ? { lte: new Date(params.get('dateTo')!) } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return success({ items });
}
