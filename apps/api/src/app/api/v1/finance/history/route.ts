import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { toNumber } from '@/lib/finance';
import { hasPermission } from '@/lib/rbac';

function sourcePerson(item: any) {
  if (item.isAnonymous) return 'Anonymous';
  if (item.contributorName) return item.contributorName;
  if (item.person) return `${item.person.firstName ?? ''} ${item.person.lastName ?? ''}`.trim();
  return item.vendorName ?? item.requestedByName ?? item.name ?? '-';
}

export async function GET(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'finance.history.view') && !hasPermission(session.permissions, 'finance.view')) {
      return failure('Forbidden', 403);
    }
    const branchFilter = { branchId: session.branchId };

    const [contributions, expenses, pledges, pledgePayments, funds, receipts] = await Promise.all([
      prisma.contribution.findMany({
        where: { ...branchFilter, deletedAt: null },
        include: { fund: true, person: true, receivedBy: true },
        take: 100,
        orderBy: { contributionDate: 'desc' },
      }),
      prisma.expense.findMany({
        where: { ...branchFilter, deletedAt: null },
        include: { fund: true, requestedBy: true, approvedBy: true },
        take: 100,
        orderBy: { expenseDate: 'desc' },
      }),
      prisma.pledge.findMany({
        where: { ...branchFilter, deletedAt: null },
        include: { fund: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pledgePayment.findMany({
        where: branchFilter,
        include: { pledge: { include: { fund: true } }, receivedBy: true },
        take: 100,
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.financialFund.findMany({
        where: branchFilter,
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.receipt.findMany({
        where: branchFilter,
        include: { contribution: { include: { fund: true } }, pledgePayment: { include: { pledge: { include: { fund: true } } } } },
        take: 100,
        orderBy: { issuedAt: 'desc' },
      }),
    ]);

    const records = [
      ...contributions.map((item) => ({
        id: `contribution-${item.id}`,
        sourceId: item.id,
        date: item.contributionDate,
        type: item.notes?.includes('financeKind=WELFARE') ? 'Welfare' : item.fund?.restricted ? 'Pledge' : 'Fund Payment',
        description: item.contributionNumber ?? item.reference ?? item.receiptNumber ?? 'Contribution recorded',
        party: sourcePerson(item),
        fund: item.notes?.includes('financeKind=WELFARE') ? 'Welfare' : item.fund?.name ?? 'Unassigned',
        amount: toNumber(item.amount),
        currency: item.currency,
        direction: 'Inflow',
        status: item.status ?? 'RECORDED',
        createdBy: item.receivedByName ?? item.receivedBy?.name ?? '-',
        receiptNumber: item.receiptNumber,
      })),
      ...expenses.map((item) => ({
        id: `expense-${item.id}`,
        sourceId: item.id,
        date: item.expenseDate,
        type: 'Expense',
        description: item.title,
        party: item.vendorName ?? item.requestedByName ?? item.requestedBy?.name ?? '-',
        fund: item.fund?.name ?? 'Unassigned',
        amount: toNumber(item.amount),
        currency: item.currency,
        direction: item.status === 'PAID' ? 'Outflow' : 'Neutral',
        status: item.status,
        createdBy: item.requestedByName ?? item.requestedBy?.name ?? '-',
        receiptNumber: item.receiptUrl ? 'Uploaded' : null,
      })),
      ...pledges.map((item) => ({
        id: `pledge-${item.id}`,
        sourceId: item.id,
        date: item.createdAt,
        type: 'Pledge',
        description: item.title,
        party: item.contributorName,
        fund: item.fund?.name ?? 'Unassigned',
        amount: toNumber(item.targetAmount),
        currency: item.currency,
        direction: 'Neutral',
        status: item.status,
        createdBy: '-',
        receiptNumber: null,
      })),
      ...pledgePayments.map((item) => ({
        id: `pledge-payment-${item.id}`,
        sourceId: item.id,
        date: item.paymentDate,
        type: 'Pledge',
        description: item.reference ?? item.pledge.title,
        party: item.pledge.contributorName,
        fund: item.pledge.fund?.name ?? 'Unassigned',
        amount: toNumber(item.amount),
        currency: item.currency,
        direction: 'Inflow',
        status: 'RECORDED',
        createdBy: item.receivedByName ?? item.receivedBy?.name ?? '-',
        receiptNumber: null,
      })),
      ...funds.map((item) => ({
        id: `fund-${item.id}`,
        sourceId: item.id,
        date: item.createdAt,
        type: 'Fund Created',
        description: item.name,
        party: item.restricted ? 'Restricted fund' : 'Unrestricted fund',
        fund: item.name,
        amount: toNumber(item.openingBalance),
        currency: 'GHS',
        direction: 'Neutral',
        status: item.status,
        createdBy: '-',
        receiptNumber: null,
      })),
      ...receipts.map((item) => ({
        id: `receipt-${item.id}`,
        sourceId: item.id,
        date: item.issuedAt,
        type: 'Receipt',
        description: item.receiptNumber,
        party: item.issuedTo,
        fund: item.contribution?.fund?.name ?? item.pledgePayment?.pledge.fund?.name ?? 'Unassigned',
        amount: toNumber(item.amount),
        currency: item.currency,
        direction: 'Neutral',
        status: item.status,
        createdBy: '-',
        receiptNumber: item.receiptNumber,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return success({ items: records });
  } catch {
    return failure('Unable to load finance history', 500);
  }
}
