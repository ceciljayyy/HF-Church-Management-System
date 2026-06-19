import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { logFinanceActivity, makeNumber, normalizeDate } from '@/lib/finance';
import { invalidateReportsCache } from '@/lib/cache-invalidation';

const fundPaymentSchema = z.object({
  contributorId: z.string().optional().nullable(),
  contributorName: z.string().optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().default('GHS'),
  paymentMethod: z.string().default('CASH'),
  paymentReference: z.string().optional(),
  paymentDate: z.string().min(1),
  receivedBy: z.string().optional(),
  note: z.string().optional(),
});

function normalizeEnum(value: string | undefined, fallback: string) {
  return (value || fallback).trim().toUpperCase().replaceAll(' ', '_');
}

async function getSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    const { id } = await context.params;
    const fund = await prisma.financialFund.findFirst({ where: { id, branchId: session.branchId } });
    if (!fund) return failure('Fund not found', 404);
    const body = fundPaymentSchema.parse(await req.json());
    const contributionNumber = makeNumber('FND');
    const receiptNumber = makeNumber('RCT');
    const paymentMethod = normalizeEnum(body.paymentMethod, 'CASH') as any;
    const contributorName = body.contributorName?.trim() || 'Contributor';
    const type = fund.restricted ? 'SPECIAL_PROJECT' : 'DONATION';

    const item = await prisma.contribution.create({
      data: {
        branchId: session.branchId,
        contributionNumber,
        personId: body.contributorId || null,
        contributorName,
        isAnonymous: false,
        fundId: fund.id,
        type: type as any,
        amount: body.amount,
        currency: body.currency || 'GHS',
        paymentMethod,
        paymentReference: body.paymentReference || null,
        reference: body.paymentReference || contributionNumber,
        contributionDate: normalizeDate(body.paymentDate),
        receivedById: session.userId,
        receivedByName: body.receivedBy || null,
        notes: body.note || null,
        receiptNumber,
        status: 'RECORDED',
      },
    });

    await prisma.receipt.create({
      data: {
        branchId: session.branchId,
        receiptNumber,
        contributionId: item.id,
        amount: item.amount,
        currency: item.currency,
        issuedTo: contributorName,
      },
    });

    await logFinanceActivity(session.branchId, session.userId, 'Fund contribution received', `${item.currency} ${body.amount.toFixed(2)} received for ${fund.name}.`, 'FINANCE_FUND_PAYMENT');
    await invalidateReportsCache(session.branchId);
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to record fund payment', 500);
  }
}
