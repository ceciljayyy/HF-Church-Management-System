import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { toNumber } from '@/lib/finance';
import { buildAttendanceOverview } from '@/lib/attendance';
import { getCacheVersion, getOrSetCache } from '@/lib/cache';
import { cacheKeys } from '@/lib/cache-keys';

type BranchFilter = { branchId?: string };
type DashboardChurchProfile = {
  welfareMonthlyPayment?: unknown | null;
  enableChildrenServiceAttendance?: boolean | null;
  enableVehicleCount?: boolean | null;
};

const CHURCH_PROFILE_CACHE_TTL_MS = 30_000;
const churchProfileCache = new Map<string, { expiresAt: number; value: DashboardChurchProfile | null }>();

function branchFilter(branchId?: string | null): BranchFilter {
  return branchId ? { branchId } : {};
}

function resultValue<T>(result: PromiseSettledResult<unknown> | undefined, fallback: T): T {
  return result?.status === 'fulfilled' ? (result.value as T) : fallback;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'short' });
}

function groupMonthlyCounts<T>(months: Date[], rows: T[], getDate: (row: T) => Date) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = monthKey(getDate(row));
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return months.map((month) => ({
    name: monthLabel(month),
    value: counts[monthKey(month)] ?? 0,
  }));
}

function groupMonthlyAmounts<T>(months: Date[], rows: T[], getDate: (row: T) => Date, getAmount: (row: T) => unknown) {
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    const key = monthKey(getDate(row));
    acc[key] = (acc[key] ?? 0) + toNumber(getAmount(row));
    return acc;
  }, {});

  return months.map((month) => ({
    name: monthLabel(month),
    value: totals[monthKey(month)] ?? 0,
  }));
}

async function getDashboardChurchProfile(branchId?: string | null) {
  if (!branchId) return null;

  const cached = churchProfileCache.get(branchId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const profile = await (prisma as any).churchProfile.findUnique({
    where: { branchId },
    select: {
      welfareMonthlyPayment: true,
      enableChildrenServiceAttendance: true,
      enableVehicleCount: true,
    },
  });

  churchProfileCache.set(branchId, {
    value: profile,
    expiresAt: Date.now() + CHURCH_PROFILE_CACHE_TTL_MS,
  });

  return profile as DashboardChurchProfile | null;
}

async function getDashboardCards(branchId?: string | null) {
  const filter = branchFilter(branchId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const churchProfile = await getDashboardChurchProfile(branchId).catch(() => null);

  const [
    peopleTotalResult,
    newPeopleThisMonthResult,
    attendanceTodayResult,
    contributionTotalResult,
    welfareTotalResult,
    expenseTotalResult,
    pendingExpenseApprovalsResult,
    activeFundCampaignsResult,
    activeMembersResult,
    upcomingEventsCountResult,
    attendanceOverviewResult,
  ] = await Promise.allSettled([
    prisma.person.count({ where: { ...filter, deletedAt: null } }),
    prisma.person.count({ where: { ...filter, deletedAt: null, createdAt: { gte: startOfMonth } } }),
    prisma.attendanceRecord.count({
      where: {
        checkedInAt: { gte: startOfToday },
        session: branchId ? { branchId } : undefined,
      },
    }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { ...filter, deletedAt: null, contributionDate: { gte: startOfMonth } },
    }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: {
        ...filter,
        deletedAt: null,
        contributionDate: { gte: startOfMonth },
        OR: [
          { type: 'WELFARE' as const },
          { type: 'OTHER' as const, notes: { contains: 'financeKind=WELFARE' } },
        ],
      },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { ...filter, deletedAt: null, expenseDate: { gte: startOfMonth } },
    }),
    prisma.expense.count({ where: { ...filter, deletedAt: null, status: 'PENDING' } }),
    prisma.financialFund.count({ where: { ...filter, status: 'ACTIVE' } }),
    prisma.member.count({ where: { ...filter, status: 'ACTIVE', deletedAt: null } }),
    prisma.event.count({
      where: { ...filter, deletedAt: null, status: 'PUBLISHED', startDateTime: { gte: now } },
    }),
    branchId ? buildAttendanceOverview(branchId, { churchProfile }) : Promise.resolve(null),
  ]);

  const peopleTotal = resultValue<number>(peopleTotalResult, 0);
  const newPeopleThisMonth = resultValue<number>(newPeopleThisMonthResult, 0);
  const attendanceToday = resultValue<number>(attendanceTodayResult, 0);
  const contributionTotal = resultValue<any>(contributionTotalResult, { _sum: { amount: 0 } });
  const welfareTotal = resultValue<any>(welfareTotalResult, { _sum: { amount: 0 } });
  const expenseTotal = resultValue<any>(expenseTotalResult, { _sum: { amount: 0 } });
  const pendingExpenseApprovals = resultValue<number>(pendingExpenseApprovalsResult, 0);
  const activeFundCampaigns = resultValue<number>(activeFundCampaignsResult, 0);
  const activeMembers = resultValue<number>(activeMembersResult, 0);
  const upcomingEventsCount = resultValue<number>(upcomingEventsCountResult, 0);
  const attendanceOverview = resultValue<any | null>(attendanceOverviewResult, null);

  const totalGivingThisMonth = toNumber(contributionTotal._sum.amount);
  const welfareCollectedThisMonth = toNumber(welfareTotal._sum.amount);
  const expenses = toNumber(expenseTotal._sum.amount);
  const welfareMonthlyPayment = toNumber(churchProfile?.welfareMonthlyPayment) || 5;

  return {
    peopleTotal,
    activePeople: peopleTotal,
    newPeopleThisMonth,
    activeMembers,
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
    upcomingEventsCount,
  };
}

async function getDashboardSummary(branchId?: string | null) {
  const filter = branchFilter(branchId);
  const now = new Date();
  const startWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (5 - index), 1));
  const churchProfile = await getDashboardChurchProfile(branchId).catch(() => null);

  const [cardsResult, detailsResult] = await Promise.allSettled([
    getDashboardCards(branchId),
    Promise.allSettled([
      prisma.person.findMany({
        where: { ...filter, deletedAt: null, createdAt: { gte: startWindow } },
        select: { createdAt: true },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          checkedInAt: { gte: startWindow },
          session: branchId ? { branchId } : undefined,
        },
        select: { checkedInAt: true },
      }),
      prisma.event.findMany({
        where: { ...filter, deletedAt: null, status: 'PUBLISHED', startDateTime: { gte: now } },
        take: 5,
        orderBy: { startDateTime: 'asc' },
        select: { id: true, title: true, startDateTime: true, status: true },
      }),
      prisma.activityLog.findMany({
        where: filter,
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, description: true, type: true, createdAt: true },
      }),
      prisma.group.groupBy({
        by: ['type'],
        where: { ...filter, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.group.findMany({
        where: { ...filter, type: 'DEPARTMENT', deletedAt: null },
        orderBy: { name: 'asc' },
        take: 10,
        select: {
          name: true,
          _count: { select: { members: true } },
        },
      }),
      prisma.person.groupBy({
        by: ['classification'],
        where: { ...filter, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.event.groupBy({
        by: ['status'],
        where: { ...filter, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.group.count({ where: { ...filter, type: 'DEPARTMENT', deletedAt: null } }),
      prisma.event.count({ where: { ...filter, deletedAt: null } }),
      prisma.contribution.findMany({
        where: { ...filter, deletedAt: null, contributionDate: { gte: startWindow } },
        select: { contributionDate: true, amount: true, type: true, notes: true },
      }),
      prisma.expense.findMany({
        where: { ...filter, deletedAt: null, expenseDate: { gte: startWindow } },
        select: { expenseDate: true, amount: true, category: true },
      }),
      branchId ? buildAttendanceOverview(branchId, { churchProfile }) : Promise.resolve(null),
    ]),
  ]);

  const cards = resultValue<any>(cardsResult, {
    peopleTotal: 0,
    activePeople: 0,
    newPeopleThisMonth: 0,
    activeMembers: 0,
    attendanceToday: 0,
    latestPeopleAttendance: 0,
    mainServiceAttendance: 0,
    childrenServiceAttendance: 0,
    vehiclesCount: 0,
    welfareCollectedThisMonth: 0,
    welfareArrears: 0,
    fundContributionsThisMonth: 0,
    expenses: 0,
    netBalance: 0,
    pendingExpenseApprovals: 0,
    activeFundCampaigns: 0,
    upcomingEventsCount: 0,
  });

  const details = resultValue<PromiseSettledResult<unknown>[]>(detailsResult, []);
  const peopleHistory = resultValue<{ createdAt: Date }[]>(details[0], []);
  const attendanceHistory = resultValue<{ checkedInAt: Date }[]>(details[1], []);
  const upcomingEvents = resultValue<any[]>(details[2], []);
  const recentActivities = resultValue<any[]>(details[3], []);
  const groupStats = resultValue<any[]>(details[4], []);
  const departmentMembersRaw = resultValue<any[]>(details[5], []);
  const peopleDistributionRaw = resultValue<any[]>(details[6], []);
  const eventStatusRaw = resultValue<any[]>(details[7], []);
  const totalDepartments = resultValue<number>(details[8], 0);
  const totalEvents = resultValue<number>(details[9], 0);
  const contributionHistory = resultValue<any[]>(details[10], []);
  const expenseHistory = resultValue<any[]>(details[11], []);
  const attendanceOverview = resultValue<any | null>(details[12], null);

  const peopleGrowthSeries = groupMonthlyCounts(months, peopleHistory, (item) => item.createdAt);
  const attendanceSeries = groupMonthlyCounts(months, attendanceHistory, (item) => item.checkedInAt);
  const contributionSeries = groupMonthlyAmounts(months, contributionHistory, (item) => item.contributionDate, (item) => item.amount);
  const expenseSeries = groupMonthlyAmounts(months, expenseHistory, (item) => item.expenseDate, (item) => item.amount);
  const financeSeries = months.map((month, index) => ({
    name: monthLabel(month),
    giving: contributionSeries[index]?.value ?? 0,
    expenses: expenseSeries[index]?.value ?? 0,
  }));

  const givingByType = Object.values(
    contributionHistory.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
      const key = item.type;
      acc[key] ??= { name: key.replaceAll('_', ' '), value: 0 };
      acc[key].value += toNumber(item.amount);
      return acc;
    }, {}),
  );

  const expensesByCategory = Object.values(
    expenseHistory.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
      const key = item.category;
      acc[key] ??= { name: key, value: 0 };
      acc[key].value += toNumber(item.amount);
      return acc;
    }, {}),
  );

  const departmentMembers = departmentMembersRaw
    .map((department) => ({
      department: department.name,
      members: department._count.members,
    }))
    .sort((a, b) => b.members - a.members);

  const peopleDistribution = peopleDistributionRaw
    .map((item) => ({
      name: item.classification ?? 'Unassigned',
      value: item._count._all,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const taskCompletion = eventStatusRaw
    .map((item) => ({
      name: item.status.replaceAll('_', ' '),
      value: item._count._all,
    }))
    .filter((item) => item.value > 0);

  const eventsAttendance = (attendanceOverview?.records ?? [])
    .filter((record: any) => record.eventId || record.sourceType === 'Event')
    .slice(0, 8)
    .reverse()
    .map((record: any) => ({
      label: new Date(record.attendanceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      attendance: Number(record.total ?? 0),
    }));

  const attendanceTrend = ((attendanceOverview?.trend?.length ? attendanceOverview.trend : attendanceSeries) ?? []).map((item: any) => ({
    label: item.name,
    attendance: Number(item.value ?? 0),
  }));

  const financeTrend = financeSeries.map((item) => ({
    label: item.name,
    amount: item.giving,
  }));

  const incomeExpenses = financeSeries.map((item) => ({
    label: item.name,
    income: item.giving,
    expenses: item.expenses,
  }));

  return {
    ...cards,
    totalFundContributions: cards.fundContributionsThisMonth,
    fundsAvailable: Math.max(cards.netBalance, 0),
    peopleGrowthSeries,
    attendanceSeries,
    financeSeries,
    givingByType,
    expensesByCategory,
    upcomingEvents,
    recentActivities,
    groupStats,
    stats: {
      totalPeople: cards.peopleTotal,
      totalDepartments,
      totalEvents,
      totalContributions: cards.welfareCollectedThisMonth + cards.fundContributionsThisMonth,
      pendingTasks: eventStatusRaw.find((item) => item.status === 'PUBLISHED')?._count._all ?? 0,
      completedTasks: eventStatusRaw.find((item) => item.status === 'COMPLETED')?._count._all ?? 0,
    },
    charts: {
      attendanceTrend,
      departmentMembers,
      peopleDistribution,
      eventsAttendance,
      financeTrend,
      incomeExpenses,
      taskCompletion,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return failure('Unauthorized', 401);

    const session = await verifySessionToken(token);
    const dashboardVersion = await getCacheVersion(cacheKeys.dashboardVersion(session.branchId));

    if (req.nextUrl.searchParams.get('scope') === 'cards') {
      const cards = await getOrSetCache(
        cacheKeys.dashboardCards(session.branchId, dashboardVersion),
        60,
        () => getDashboardCards(session.branchId) as any,
      );
      return success(cards);
    }

    const summary = await getOrSetCache(
      cacheKeys.dashboardSummary(session.branchId, dashboardVersion),
      60,
      () => getDashboardSummary(session.branchId) as any,
    );

    return success(summary);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('jwt')) {
      return failure('Unauthorized', 401);
    }
    return failure('Unable to load dashboard summary', 500);
  }
}
