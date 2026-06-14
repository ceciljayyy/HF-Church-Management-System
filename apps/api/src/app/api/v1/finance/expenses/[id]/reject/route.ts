import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { logFinanceActivity } from '@/lib/finance';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return failure('Unauthorized', 401);
    const session = await verifySessionToken(token);
    const { id } = await params;
    const expense = await prisma.expense.findFirst({ where: { id, branchId: session.branchId, deletedAt: null } });
    if (!expense) return failure('Expense not found', 404);
    const item = await prisma.expense.update({
      where: { id },
      data: { status: 'REJECTED', approvedById: session.userId, approvedByName: session.email },
    });
    await logFinanceActivity(session.branchId, session.userId, 'Expense rejected', `${item.title} was rejected.`, 'FINANCE_EXPENSE_REJECTED');
    return success({ item });
  } catch {
    return failure('Unable to reject expense', 500);
  }
}
