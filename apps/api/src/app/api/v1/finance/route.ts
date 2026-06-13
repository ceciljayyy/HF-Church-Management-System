import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const session = await verifySessionToken(token);
    const branchFilter = session.branchId ? { branchId: session.branchId } : {};

    const [contributions, expenses, tithes, offerings] = await Promise.all([
      prisma.contribution.aggregate({
        _sum: { amount: true },
        where: branchFilter,
      }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: branchFilter }),
      prisma.contribution.aggregate({ _sum: { amount: true }, where: { ...branchFilter, type: 'TITHE' } }),
      prisma.contribution.aggregate({ _sum: { amount: true }, where: { ...branchFilter, type: 'OFFERING' } }),
    ]);

    const giving = Number(contributions._sum.amount ?? 0);
    const expenseTotal = Number(expenses._sum.amount ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        contributions: giving,
        giving,
        tithes: Number(tithes._sum.amount ?? 0),
        offerings: Number(offerings._sum.amount ?? 0),
        expenses: expenseTotal,
        netBalance: giving - expenseTotal,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 },
    );
  }
}
