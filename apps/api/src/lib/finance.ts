import { prisma } from './prisma';

type BranchFilter = { branchId?: string };

export function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function normalizeDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date');
  return date;
}

export function makeNumber(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'short' });
}

export async function getFinanceOverview(branchId?: string | null) {
  const branchFilter: BranchFilter = branchId ? { branchId } : {};
  const now = new Date();
  const startOfMonth = startOfCurrentMonth();
  const startWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (5 - index), 1));

  const [
    contributionTotal,
    welfareTotal,
    tithes,
    offerings,
    donations,
    expenseTotal,
    pendingApprovals,
    activePledgesCount,
    pledges,
    pledgePayments,
    funds,
    recentContributions,
    recentExpenses,
    activityLogs,
    contributionHistory,
    expenseHistory,
    activeMembers,
    churchProfile,
  ] = await Promise.all([
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { ...branchFilter, deletedAt: null, contributionDate: { gte: startOfMonth } },
    }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { ...branchFilter, deletedAt: null, type: 'OTHER', notes: { contains: 'financeKind=WELFARE' }, contributionDate: { gte: startOfMonth } },
    }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { ...branchFilter, deletedAt: null, type: 'TITHE', contributionDate: { gte: startOfMonth } },
    }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { ...branchFilter, deletedAt: null, type: 'OFFERING', contributionDate: { gte: startOfMonth } },
    }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { ...branchFilter, deletedAt: null, type: 'DONATION', contributionDate: { gte: startOfMonth } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { ...branchFilter, deletedAt: null, expenseDate: { gte: startOfMonth } },
    }),
    prisma.expense.count({ where: { ...branchFilter, deletedAt: null, status: 'PENDING' } }),
    prisma.pledge.count({ where: { ...branchFilter, deletedAt: null, status: 'ACTIVE' } }),
    prisma.pledge.findMany({
      where: { ...branchFilter, deletedAt: null },
      include: { fund: true, payments: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pledgePayment.findMany({ where: branchFilter, include: { pledge: true }, orderBy: { paymentDate: 'desc' } }),
    prisma.financialFund.findMany({
      where: branchFilter,
      include: { contributions: { where: { deletedAt: null } }, expenses: { where: { deletedAt: null, status: 'PAID' } }, pledges: { include: { payments: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.contribution.findMany({
      where: { ...branchFilter, deletedAt: null },
      include: { fund: true, person: true, receivedBy: true },
      take: 8,
      orderBy: { contributionDate: 'desc' },
    }),
    prisma.expense.findMany({
      where: { ...branchFilter, deletedAt: null },
      include: { fund: true, requestedBy: true, approvedBy: true },
      take: 8,
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.activityLog.findMany({ where: { ...branchFilter, type: { startsWith: 'FINANCE' } }, take: 12, orderBy: { createdAt: 'desc' } }),
    prisma.contribution.findMany({
      where: { ...branchFilter, deletedAt: null, contributionDate: { gte: startWindow } },
      select: { contributionDate: true, amount: true, type: true, notes: true, fund: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { ...branchFilter, deletedAt: null, expenseDate: { gte: startWindow } },
      select: { expenseDate: true, amount: true, category: true },
    }),
    prisma.member.count({ where: { ...branchFilter, status: 'ACTIVE', deletedAt: null } }),
    branchId ? (prisma as any).churchProfile.findUnique({ where: { branchId } }) : Promise.resolve(null),
  ]);

  const totalGivingThisMonth = toNumber(contributionTotal._sum.amount);
  const totalWelfareCollectedThisMonth = toNumber(welfareTotal._sum.amount);
  const totalExpensesThisMonth = toNumber(expenseTotal._sum.amount);
  const totalPledged = pledges.reduce((total, pledge) => total + toNumber(pledge.targetAmount), 0);
  const totalPledgePayments = pledgePayments.reduce((total, payment) => total + toNumber(payment.amount), 0);
  const outstandingPledgeBalance = Math.max(totalPledged - totalPledgePayments, 0);
  const collectionRate = totalPledged > 0 ? Math.round((totalPledgePayments / totalPledged) * 100) : 0;

  const fundSummaries = funds.map((fund) => {
    const contributions = fund.contributions.reduce((total, item) => total + toNumber(item.amount), 0);
    const expenses = fund.expenses.reduce((total, item) => total + toNumber(item.amount), 0);
    const pledgeIncome = fund.pledges.flatMap((pledge) => pledge.payments).reduce((total, item) => total + toNumber(item.amount), 0);
    const currentBalance = toNumber(fund.openingBalance) + contributions + pledgeIncome - expenses;
    return {
      id: fund.id,
      name: fund.name,
      title: fund.name,
      fundTypeName: fund.restricted ? 'Pledges' : 'Temple Sacrifice',
      description: fund.description,
      restricted: fund.restricted,
      status: fund.status,
      targetAmount: toNumber(fund.openingBalance),
      amountCollected: contributions + pledgeIncome,
      balanceRemaining: Math.max(toNumber(fund.openingBalance) - contributions - pledgeIncome, 0),
      openingBalance: toNumber(fund.openingBalance),
      totalContributions: contributions,
      totalPledgePayments: pledgeIncome,
      totalExpenses: expenses,
      currentBalance,
    };
  });

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

  const financeSeries = months.map((month) => {
    const key = monthKey(month);
    const giving = contributionHistory.filter((item) => monthKey(item.contributionDate) === key).reduce((total, item) => total + toNumber(item.amount), 0);
    const expenses = expenseHistory.filter((item) => monthKey(item.expenseDate) === key).reduce((total, item) => total + toNumber(item.amount), 0);
    return { name: monthLabel(month), giving, expenses };
  });

  const welfareMonthlyTrend = months.map((month) => {
    const key = monthKey(month);
    return {
      name: monthLabel(month),
      value: contributionHistory
        .filter((item) => item.notes?.includes('financeKind=WELFARE') && monthKey(item.contributionDate) === key)
        .reduce((total, item) => total + toNumber(item.amount), 0),
    };
  });

  const expensesTrend = months.map((month) => {
    const key = monthKey(month);
    return {
      name: monthLabel(month),
      value: expenseHistory
        .filter((item) => monthKey(item.expenseDate) === key)
        .reduce((total, item) => total + toNumber(item.amount), 0),
    };
  });

  const fundContributionsByFundType = [
    {
      name: 'Temple Sacrifice',
      value: fundSummaries.filter((fund) => !fund.restricted).reduce((total, fund) => total + fund.amountCollected, 0),
    },
    {
      name: 'Pledges',
      value: fundSummaries.filter((fund) => fund.restricted).reduce((total, fund) => total + fund.amountCollected, 0),
    },
  ];

  const totalFundContributions = fundSummaries.reduce((total, fund) => total + fund.amountCollected, 0);
  const activeFunds = fundSummaries.filter((fund) => fund.status === 'ACTIVE').length;
  const welfareMonthlyPayment = toNumber(churchProfile?.welfareMonthlyPayment) || 5;
  const welfareArrears = Math.max(activeMembers * welfareMonthlyPayment - totalWelfareCollectedThisMonth, 0);

  return {
    totalWelfareCollectedThisMonth,
    welfareArrears,
    activeFunds,
    totalFundContributions,
    fundContributionsThisMonth: totalGivingThisMonth - totalWelfareCollectedThisMonth,
    availableBalance: fundSummaries.reduce((total, fund) => total + fund.currentBalance, 0),
    welfareMonthlyTrend,
    expensesTrend,
    fundContributionsByFundType,
    welfarePaidVsUnpaid: [
      { name: 'Paid', value: Math.floor(totalWelfareCollectedThisMonth / welfareMonthlyPayment) },
      { name: 'Unpaid', value: Math.max(activeMembers - Math.floor(totalWelfareCollectedThisMonth / welfareMonthlyPayment), 0) },
    ],
    totalGivingThisMonth,
    contributions: totalGivingThisMonth,
    tithes: toNumber(tithes._sum.amount),
    offerings: toNumber(offerings._sum.amount),
    donations: toNumber(donations._sum.amount),
    totalExpensesThisMonth,
    expenses: totalExpensesThisMonth,
    netBalance: totalGivingThisMonth - totalExpensesThisMonth,
    pendingExpenseApprovals: pendingApprovals,
    activePledges: activePledgesCount,
    totalPledged,
    totalPledgePayments,
    outstandingPledgeBalance,
    pledgeCollectionRate: collectionRate,
    fundsAvailable: fundSummaries.reduce((total, fund) => total + fund.currentBalance, 0),
    givingByType,
    expensesByCategory,
    financeSeries,
    incomeVsExpenses: financeSeries,
    fundBalances: fundSummaries.map((fund) => ({ name: fund.name, value: fund.currentBalance })),
    pledgeProgress: pledges.slice(0, 8).map((pledge) => {
      const paid = pledge.payments.reduce((total, payment) => total + toNumber(payment.amount), 0);
      const target = toNumber(pledge.targetAmount);
      return {
        id: pledge.id,
        title: pledge.title,
        contributorName: pledge.contributorName,
        fundName: pledge.fund?.name ?? 'Unassigned',
        targetAmount: target,
        amountPaid: paid,
        balance: Math.max(target - paid, 0),
        progress: target > 0 ? Math.round((paid / target) * 100) : 0,
        dueDate: pledge.dueDate,
        status: pledge.status,
      };
    }),
    recentContributions,
    recentExpenses,
    pendingApprovals: recentExpenses.filter((expense) => expense.status === 'PENDING'),
    recentPledgePayments: pledgePayments.slice(0, 8),
    activePledgeRecords: pledges.filter((pledge) => pledge.status === 'ACTIVE').slice(0, 8),
    funds: fundSummaries,
    activityLogs,
  };
}

export async function logFinanceActivity(branchId: string, userId: string | null | undefined, title: string, description: string, type: string) {
  await prisma.activityLog.create({
    data: {
      branchId,
      userId: userId ?? null,
      title,
      description,
      type,
    },
  });
}
