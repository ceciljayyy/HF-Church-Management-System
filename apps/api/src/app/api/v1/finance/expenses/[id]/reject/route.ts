import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { logFinanceActivity } from '@/lib/finance';
import { getRequestSession } from '@/lib/request-session';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';
import { invalidateReportsCache } from '@/lib/cache-invalidation';
import { hasPermission } from '@/lib/rbac';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'expenses.reject')) return failure('Forbidden', 403);
    const { id } = await params;
    const expense = await prisma.expense.findFirst({ where: { id, branchId: session.branchId, deletedAt: null } });
    if (!expense) return failure('Expense not found', 404);
    const item = await prisma.expense.update({
      where: { id },
      data: { status: 'REJECTED', approvedById: session.userId, approvedByName: session.email },
    });
    await logFinanceActivity(session.branchId, session.userId, 'Expense rejected', `${item.title} was rejected.`, 'FINANCE_EXPENSE_REJECTED');
    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'EXPENSE_REJECT',
      entity: 'Expense',
      entityId: item.id,
      module: 'finance',
      oldValue: { status: expense.status, approvedById: expense.approvedById },
      newValue: { status: item.status, approvedById: item.approvedById },
      ...auditMetaFromRequest(req),
    });
    await invalidateReportsCache(session.branchId);
    return success({ item });
  } catch {
    return failure('Unable to reject expense', 500);
  }
}
