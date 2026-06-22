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
  enableChildrenServiceAttendance?: boolean | null;
  enableVehicleCount?: boolean | null;
};
type DashboardAttendanceRecord = {
  attendanceDate: string;
  sectionSlug?: string;
  total?: number;
};
type WeeklyAttendanceBucket = {
  date: Date;
  mainService: number;
  childrenService: number;
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

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'short' });
}

function dayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function birthdayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function isWelfareContribution(item: { type?: string | null; notes?: string | null }) {
  return item.type === 'WELFARE' || item.notes?.includes('financeKind=WELFARE');
}

function cleanAction(action: string) {
  return action.replaceAll('_', ' ').replaceAll('.', ' ').toLowerCase();
}

function describeAuditLog(log: { action: string; entity: string; entityId?: string | null }) {
  const entityName = log.entityId ?? log.entity;
  return `${cleanAction(log.action)} ${entityName}`.trim();
}

async function getDashboardChurchProfile(branchId?: string | null) {
  if (!branchId) return null;

  const cached = churchProfileCache.get(branchId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const profile = await (prisma as any).churchProfile.findUnique({
    where: { branchId },
    select: {
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

function buildWeeklyAttendanceTrend(attendanceOverview: any | null) {
  const records = ((attendanceOverview?.records ?? []) as DashboardAttendanceRecord[])
    .filter((record) => record.sectionSlug === 'main-service' || record.sectionSlug === 'children-service')
    .slice()
    .sort((a, b) => new Date(a.attendanceDate).getTime() - new Date(b.attendanceDate).getTime());

  const byDate: Record<string, WeeklyAttendanceBucket> = records.reduce((acc: Record<string, WeeklyAttendanceBucket>, record) => {
    const date = new Date(record.attendanceDate);
    const key = dayKey(date);
    acc[key] ??= { date, mainService: 0, childrenService: 0 };
    if (record.sectionSlug === 'main-service') acc[key].mainService += Number(record.total ?? 0);
    if (record.sectionSlug === 'children-service') acc[key].childrenService += Number(record.total ?? 0);
    return acc;
  }, {});

  return Object.values(byDate)
    .slice(-8)
    .map((item) => ({
      label: dayLabel(item.date),
      mainService: item.mainService,
      childrenService: item.childrenService,
      total: item.mainService + item.childrenService,
    }));
}

async function getDashboardCards(branchId?: string | null) {
  const filter = branchFilter(branchId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const churchProfile = await getDashboardChurchProfile(branchId).catch(() => null);

  const [
    totalPeopleResult,
    newPeopleThisMonthResult,
    contributionTotalResult,
    expenseTotalResult,
    attendanceOverviewResult,
  ] = await Promise.allSettled([
    prisma.person.count({ where: { ...filter, deletedAt: null } }),
    prisma.person.count({ where: { ...filter, deletedAt: null, createdAt: { gte: startOfMonth } } }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { ...filter, deletedAt: null },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { ...filter, deletedAt: null },
    }),
    branchId ? buildAttendanceOverview(branchId, { churchProfile }) : Promise.resolve(null),
  ]);

  const attendanceOverview = resultValue<any | null>(attendanceOverviewResult, null);
  const totalIncome = toNumber(resultValue<any>(contributionTotalResult, { _sum: { amount: 0 } })._sum.amount);
  const totalExpenses = toNumber(resultValue<any>(expenseTotalResult, { _sum: { amount: 0 } })._sum.amount);

  return {
    totalPeople: resultValue<number>(totalPeopleResult, 0),
    newPeopleThisMonth: resultValue<number>(newPeopleThisMonthResult, 0),
    totalAttendance: Number(attendanceOverview?.peopleAttendanceToday ?? 0),
    netBalance: totalIncome - totalExpenses,
  };
}

async function getBirthdaysThisMonth(branchId?: string | null, limit = 3) {
  if (!branchId) return [];

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const people = await prisma.person.findMany({
    where: {
      branchId,
      deletedAt: null,
      dateOfBirth: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      preferredName: true,
      dateOfBirth: true,
      phone: true,
      mobilePhone: true,
      profilePhotoUrl: true,
    },
  });

  return people
    .filter((person) => person.dateOfBirth && person.dateOfBirth.getMonth() === currentMonth)
    .sort((a, b) => {
      const firstDay = a.dateOfBirth?.getDate() ?? 0;
      const secondDay = b.dateOfBirth?.getDate() ?? 0;
      return firstDay - secondDay;
    })
    .slice(0, limit)
    .map((person) => {
      const dateOfBirth = person.dateOfBirth as Date;
      const fullName = [person.preferredName || person.firstName, person.middleName, person.lastName]
        .filter(Boolean)
        .join(' ');

      return {
        id: person.id,
        fullName,
        dateOfBirth,
        birthdayLabel: birthdayLabel(dateOfBirth),
        phone: person.mobilePhone ?? person.phone ?? null,
        avatarUrl: person.profilePhotoUrl ?? null,
        isToday: dateOfBirth.getDate() === currentDay,
      };
    });
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
      prisma.contribution.findMany({
        where: { ...filter, deletedAt: null, contributionDate: { gte: startWindow } },
        select: { contributionDate: true, amount: true, type: true, notes: true },
      }),
      prisma.expense.findMany({
        where: { ...filter, deletedAt: null, expenseDate: { gte: startWindow } },
        select: { expenseDate: true, amount: true },
      }),
      prisma.auditLog.findMany({
        where: filter,
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      branchId ? buildAttendanceOverview(branchId, { churchProfile }) : Promise.resolve(null),
      getBirthdaysThisMonth(branchId, 3),
    ]),
  ]);

  const cards = resultValue<any>(cardsResult, {
    totalPeople: 0,
    newPeopleThisMonth: 0,
    totalAttendance: 0,
    netBalance: 0,
  });
  const details = resultValue<PromiseSettledResult<unknown>[]>(detailsResult, []);
  const contributionHistory = resultValue<any[]>(details[0], []);
  const expenseHistory = resultValue<any[]>(details[1], []);
  const recentActivities = resultValue<any[]>(details[2], []).map((item) => ({
    id: item.id,
    title: cleanAction(item.action),
    description: describeAuditLog(item),
    module: item.entity,
    actorName: item.user?.name ?? 'System',
    createdAt: item.createdAt,
  }));
  const attendanceOverview = resultValue<any | null>(details[3], null);
  const birthdaysThisMonth = resultValue<any[]>(details[4], []);

  const monthlyFinanceFlow = months.map((month) => {
    const key = monthKey(month);
    const contributions = contributionHistory.filter((item) => monthKey(item.contributionDate) === key);
    const welfareCollected = contributions
      .filter(isWelfareContribution)
      .reduce((sum, item) => sum + toNumber(item.amount), 0);
    const fundContributions = contributions
      .filter((item) => !isWelfareContribution(item))
      .reduce((sum, item) => sum + toNumber(item.amount), 0);
    const expenses = expenseHistory
      .filter((item) => monthKey(item.expenseDate) === key)
      .reduce((sum, item) => sum + toNumber(item.amount), 0);

    return {
      label: monthLabel(month),
      welfareCollected,
      fundContributions,
      expenses,
      netBalance: welfareCollected + fundContributions - expenses,
    };
  });

  return {
    cards,
    charts: {
      weeklyAttendanceTrend: buildWeeklyAttendanceTrend(attendanceOverview),
      monthlyFinanceFlow,
    },
    recentActivities,
    rightPanel: {
      birthdaysThisMonth,
      recentActivities,
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
      return success({ cards });
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
