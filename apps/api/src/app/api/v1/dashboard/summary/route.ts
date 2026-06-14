import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { getFinanceOverview } from '@/lib/finance';

export async function GET(_req: NextRequest) {
  try {
    const token = getTokenFromRequest(_req);
    if (!token) return failure('Unauthorized', 401);
    const session = await verifySessionToken(token);
    const branchFilter = session?.branchId ? { branchId: session.branchId } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      membersTotal,
      activeMembers,
      newMembersThisMonth,
      attendanceToday,
      financeOverview,
    ] = await Promise.all([
      prisma.member.count({ where: branchFilter }),
      prisma.member.count({ where: { ...branchFilter, status: 'ACTIVE' } }),
      prisma.member.count({ where: { ...branchFilter, createdAt: { gte: startOfMonth } } }),
      prisma.attendanceRecord.count({
        where: {
          checkedInAt: { gte: startOfToday },
          session: session.branchId ? { branchId: session.branchId } : undefined,
        },
      }),
      getFinanceOverview(session.branchId),
    ]);

    const expensesValue = financeOverview.expenses;

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return date;
    });

    const [
      memberHistory,
      attendanceHistory,
    ] = await Promise.all([
      prisma.member.findMany({ where: { ...branchFilter, createdAt: { gte: startWindow } }, select: { createdAt: true } }),
      prisma.attendanceRecord.findMany({
        where: {
          checkedInAt: { gte: startWindow },
          session: session.branchId ? { branchId: session.branchId } : undefined,
        },
        select: { checkedInAt: true },
      }),
    ]);

    const monthKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = (date: Date) =>
      date.toLocaleString('en-US', { month: 'short' });

    const memberGrowthSeries = months.map((month) => {
      const key = monthKey(month);
      return {
        name: monthLabel(month),
        value: memberHistory.filter((item) => monthKey(item.createdAt) === key)
          .length,
      };
    });

    const attendanceSeries = months.map((month) => {
      const key = monthKey(month);
      return {
        name: monthLabel(month),
        value: attendanceHistory.filter(
          (item) => monthKey(item.checkedInAt) === key,
        ).length,
      };
    });

    return success({
      membersTotal,
      activeMembers,
      newMembersThisMonth,
      attendanceToday,
      welfareCollectedThisMonth: financeOverview.totalWelfareCollectedThisMonth,
      welfareArrears: financeOverview.welfareArrears,
      fundContributionsThisMonth: financeOverview.fundContributionsThisMonth,
      totalFundContributions: financeOverview.totalFundContributions,
      expenses: expensesValue,
      netBalance: financeOverview.netBalance,
      pendingExpenseApprovals: financeOverview.pendingExpenseApprovals,
      activeFundCampaigns: financeOverview.activeFunds,
      fundsAvailable: financeOverview.fundsAvailable,
      memberGrowthSeries,
      attendanceSeries,
      financeSeries: financeOverview.financeSeries,
      givingByType: financeOverview.givingByType,
      expensesByCategory: financeOverview.expensesByCategory,
      upcomingEvents: await prisma.event.findMany({
        where: { ...branchFilter, status: 'PUBLISHED' },
        take: 5,
        orderBy: { startDateTime: 'asc' },
      }),
      recentActivities: await prisma.activityLog.findMany({
        where: branchFilter,
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      groupStats: await prisma.group.groupBy({
        by: ['type'],
        where: branchFilter,
        _count: { _all: true },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('jwt')) {
      return failure('Unauthorized', 401);
    }
    return failure('Unable to load dashboard summary', 500, error);
  }
}
