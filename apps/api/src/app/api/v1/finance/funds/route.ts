import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { logFinanceActivity, toNumber } from '@/lib/finance';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';
import { hasPermission } from '@/lib/rbac';

const fundSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  fundTypeId: z.string().optional(),
  fundTypeName: z.string().optional(),
  targetAmount: z.coerce.number().nonnegative().optional(),
  openingBalance: z.coerce.number().nonnegative().default(0),
  restricted: z.boolean().default(false),
  status: z.string().optional(),
});

async function getSession(req: NextRequest) {
  return getRequestSession(req);
}

function normalizeStatus(value: string | undefined) {
  return (value || 'ACTIVE').trim().toUpperCase();
}

function summarizeFund(fund: any) {
  const totalContributions = fund.contributions.reduce((total: number, item: any) => total + toNumber(item.amount), 0);
  const totalExpenses = fund.expenses.reduce((total: number, item: any) => total + toNumber(item.amount), 0);
  const totalPledgePayments = fund.pledges.flatMap((pledge: any) => pledge.payments).reduce((total: number, item: any) => total + toNumber(item.amount), 0);
  const currentBalance = toNumber(fund.openingBalance) + totalContributions + totalPledgePayments - totalExpenses;
  return {
    ...fund,
    title: fund.name,
    fundTypeName: fund.restricted ? 'Pledges' : 'Temple Sacrifice',
    targetAmount: toNumber(fund.openingBalance),
    amountCollected: totalContributions + totalPledgePayments,
    balanceRemaining: Math.max(toNumber(fund.openingBalance) - totalContributions - totalPledgePayments, 0),
    totalContributions,
    totalPledgePayments,
    totalExpenses,
    currentBalance,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'funds.view')) return failure('Forbidden', 403);
  const funds = await prisma.financialFund.findMany({
    where: { branchId: session.branchId },
    include: {
      contributions: { where: { deletedAt: null } },
      expenses: { where: { deletedAt: null, status: 'PAID' } },
      pledges: { include: { payments: true } },
    },
    orderBy: { name: 'asc' },
  });
  return success({ items: funds.map(summarizeFund) });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'funds.create')) return failure('Forbidden', 403);
    const body = fundSchema.parse(await req.json());
    const targetAmount = body.targetAmount ?? body.openingBalance;
    const item = await prisma.financialFund.create({
      data: {
        branchId: session.branchId,
        name: (body.title ?? body.name).trim(),
        description: [body.fundTypeName ? `Fund Type: ${body.fundTypeName}` : '', body.description ?? ''].filter(Boolean).join('\n') || null,
        openingBalance: targetAmount,
        restricted: body.restricted,
        status: normalizeStatus(body.status) as any,
        isActive: normalizeStatus(body.status) === 'ACTIVE',
      },
    });
    await logFinanceActivity(session.branchId, session.userId, 'Fund created', `${item.name} was created.`, 'FINANCE_FUND');
    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'FUND_CREATE',
      entity: 'FinancialFund',
      entityId: item.id,
      module: 'finance',
      newValue: { name: item.name, openingBalance: item.openingBalance, status: item.status },
      ...auditMetaFromRequest(req),
    });
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to create fund', 500);
  }
}
