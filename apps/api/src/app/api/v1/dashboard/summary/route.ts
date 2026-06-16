import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { getFinanceOverview, toNumber } from '@/lib/finance';
import { buildAttendanceOverview } from '@/lib/attendance';

async function getDashboardCards(branchId?: string | null) {
  const branchFilter = branchId ? { branchId } : {};
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    peopleTotal,
    newPeopleThisMonth,
    attendanceToday,
    contributionTotal,
    welfareTotal,
    expenseTotal,
    pendingExpenseApprovals,
    activeFundCampaigns,
    activeMembers,
    churchProfile,
    attendanceOverview,
  ] = await Promise.all([
    prisma.person.count({ where: { ...branchFilter, deletedAt: null } }),
    prisma.person.count({ where: { ...branchFilter, deletedAt: null, createdAt: { gte: startOfMonth } } }),
    prisma.attendanceRecord.count({
      where: {
        checkedInAt: { gte: startOfToday },
        session: branchId ? { branchId } : undefined,
      },
    }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { ...branchFilter, deletedAt: null, contributionDate: { gte: startOfMonth } },
    }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { ...branchFilter, deletedAt: null, type: 'OTHER', notes: { contains: 'financeKind=WELFARE' }, contributionDate: { gte: startOfMonth } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { ...branchFilter, deletedAt: null, expenseDate: { gte: startOfMonth } },
    }),
    prisma.expense.count({ where: { ...branchFilter, deletedAt: null, status: 'PENDING' } }),
    prisma.financialFund.count({ where: { ...branchFilter, status: 'ACTIVE' } }),
    prisma.member.count({ where: { ...branchFilter, status: 'ACTIVE', deletedAt: null } }),
    branchId ? (prisma as any).churchProfile.findUnique({ where: { branchId } }) : Promise.resolve(null),
    branchId ? buildAttendanceOverview(branchId) : Promise.resolve(null),
  ]);

  const totalGivingThisMonth = toNumber(contributionTotal._sum.amount);
  const welfareCollectedThisMonth = toNumber(welfareTotal._sum.amount);
  const expenses = toNumber(expenseTotal._sum.amount);
  const welfareMonthlyPayment = toNumber(churchProfile?.welfareMonthlyPayment) || 5;

  return {
    peopleTotal,
    activePeople: peopleTotal,
    newPeopleThisMonth,
    attendanceToday,
    latestPeopleAttendance: attendanceOverview?.peopleAttendanceToday ?? 0,
    mainServiceAttendance: attendanceOverview?.cards.main.latestTotal ?? 0,
    childrenServiceAttendance: attendanceOverview?.cards.children.latestTotal ?? 0,
    vehiclesCount: attendanceOverview?.vehiclesToday ?? 0,
    welfareCollectedThisMonth,
    welfareArrears: Math.max(activeMembers * welfareMonthlyPayment - welfareCollectedThisMonth, 0),
    fundContributionsThisMonth: totalGivingThisMonth - welfareCollectedThisMonth,
    expenses,
    netBalance: totalGivingThisMonth - expenses,
    pendingExpenseApprovals,
    activeFundCampaigns,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const token = getTokenFromRequest(_req);
    if (!token) return failure('Unauthorized', 401);
    const session = await verifySessionToken(token);
    if (_req.nextUrl.searchParams.get('scope') === 'cards') {
      return success(await getDashboardCards(session.branchId));
    }

    const branchFilter = session?.branchId ? { branchId: session.branchId } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      peopleTotal,
      activePeople,
      newPeopleThisMonth,
      attendanceToday,
      financeOverview,
      attendanceOverview,
    ] = await Promise.all([
      prisma.person.count({ where: { ...branchFilter, deletedAt: null } }),
      prisma.person.count({ where: { ...branchFilter, deletedAt: null } }),
      prisma.person.count({ where: { ...branchFilter, deletedAt: null, createdAt: { gte: startOfMonth } } }),
      prisma.attendanceRecord.count({
        where: {
          checkedInAt: { gte: startOfToday },
          session: session.branchId ? { branchId: session.branchId } : undefined,
        },
      }),
      getFinanceOverview(session.branchId),
      buildAttendanceOverview(session.branchId),
    ]);

    const expensesValue = financeOverview.expenses;

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return date;
    });

    const [
      peopleHistory,
      attendanceHistory,
    ] = await Promise.all([
      prisma.person.findMany({ where: { ...branchFilter, deletedAt: null, createdAt: { gte: startWindow } }, select: { createdAt: true } }),
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

    const peopleGrowthSeries = months.map((month) => {
      const key = monthKey(month);
      return {
        name: monthLabel(month),
        value: peopleHistory.filter((item) => monthKey(item.createdAt) === key)
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
      peopleTotal,
      activePeople,
      newPeopleThisMonth,
      attendanceToday,
      latestPeopleAttendance: attendanceOverview.peopleAttendanceToday,
      mainServiceAttendance: attendanceOverview.cards.main.latestTotal,
      childrenServiceAttendance: attendanceOverview.cards.children.latestTotal,
      vehiclesCount: attendanceOverview.vehiclesToday,
      welfareCollectedThisMonth: financeOverview.totalWelfareCollectedThisMonth,
      welfareArrears: financeOverview.welfareArrears,
      fundContributionsThisMonth: financeOverview.fundContributionsThisMonth,
      totalFundContributions: financeOverview.totalFundContributions,
      expenses: expensesValue,
      netBalance: financeOverview.netBalance,
      pendingExpenseApprovals: financeOverview.pendingExpenseApprovals,
      activeFundCampaigns: financeOverview.activeFunds,
      fundsAvailable: financeOverview.fundsAvailable,
      peopleGrowthSeries,
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
