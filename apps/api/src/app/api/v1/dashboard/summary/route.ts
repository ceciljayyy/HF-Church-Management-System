import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

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
      tithes,
      offerings,
      expenses,
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
      prisma.contribution.aggregate({
        _sum: { amount: true },
        where: {
          ...branchFilter,
          type: 'TITHE',
          contributionDate: { gte: startOfMonth },
        },
      }),
      prisma.contribution.aggregate({
        _sum: { amount: true },
        where: {
          ...branchFilter,
          type: 'OFFERING',
          contributionDate: { gte: startOfMonth },
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { ...branchFilter, expenseDate: { gte: startOfMonth } },
      }),
    ]);

    const tithesValue = Number(tithes._sum.amount ?? 0);
    const offeringsValue = Number(offerings._sum.amount ?? 0);
    const expensesValue = Number(expenses._sum.amount ?? 0);
    const totalGivingThisMonth = tithesValue + offeringsValue;

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return date;
    });

    const [
      memberHistory,
      attendanceHistory,
      contributionHistory,
      expenseHistory,
    ] = await Promise.all([
      prisma.member.findMany({ where: { ...branchFilter, createdAt: { gte: startWindow } }, select: { createdAt: true } }),
      prisma.attendanceRecord.findMany({
        where: {
          checkedInAt: { gte: startWindow },
          session: session.branchId ? { branchId: session.branchId } : undefined,
        },
        select: { checkedInAt: true },
      }),
      prisma.contribution.findMany({
        where: { ...branchFilter, contributionDate: { gte: startWindow } },
        select: { contributionDate: true, amount: true, type: true },
      }),
      prisma.expense.findMany({
        where: { ...branchFilter, expenseDate: { gte: startWindow } },
        select: { expenseDate: true, amount: true },
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

    const financeSeries = months.map((month) => {
      const key = monthKey(month);
      const giving = contributionHistory
        .filter((item) => monthKey(item.contributionDate) === key)
        .reduce((total, item) => total + Number(item.amount), 0);
      const monthExpenses = expenseHistory
        .filter((item) => monthKey(item.expenseDate) === key)
        .reduce((total, item) => total + Number(item.amount), 0);
      return { name: monthLabel(month), giving, expenses: monthExpenses };
    });

    return success({
      membersTotal,
      activeMembers,
      newMembersThisMonth,
      attendanceToday,
      totalGivingThisMonth,
      tithes: tithesValue,
      offerings: offeringsValue,
      expenses: expensesValue,
      netBalance: totalGivingThisMonth - expensesValue,
      memberGrowthSeries,
      attendanceSeries,
      financeSeries,
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
