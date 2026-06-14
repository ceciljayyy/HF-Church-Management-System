import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { logFinanceActivity, makeNumber, normalizeDate } from '@/lib/finance';
import { auditMetaFromRequest, createAuditLog } from '@/lib/audit';

const welfarePaymentSchema = z.object({
  memberId: z.string().min(1),
  paymentType: z.string().min(1),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000),
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

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  const items = await prisma.contribution.findMany({
    where: { branchId: session.branchId, type: 'OTHER', notes: { contains: 'financeKind=WELFARE' }, deletedAt: null },
    include: { person: true, receivedBy: true },
    orderBy: { contributionDate: 'desc' },
    take: 100,
  });
  return success({ items });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    const body = welfarePaymentSchema.parse(await req.json());
    const person = await prisma.person.findFirst({ where: { id: body.memberId, branchId: session.branchId, deletedAt: null } });
    if (!person) return failure('Member is required.', 422);

    const contributionNumber = makeNumber('WEL');
    const receiptNumber = makeNumber('RCT');
    const paymentMethod = normalizeEnum(body.paymentMethod, 'CASH') as any;
    const memberName = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || person.preferredName || 'Member';
    const noteParts = ['financeKind=WELFARE', `paymentType=${normalizeEnum(body.paymentType, 'MONTHLY_PAYMENT')}`, `month=${body.month}`, `year=${body.year}`];
    if (body.note) noteParts.push(body.note);

    const item = await prisma.contribution.create({
      data: {
        branchId: session.branchId,
        contributionNumber,
        personId: person.id,
        contributorName: memberName,
        isAnonymous: false,
        type: 'OTHER',
        amount: body.amount,
        currency: body.currency || 'GHS',
        paymentMethod,
        paymentReference: body.paymentReference || null,
        reference: body.paymentReference || contributionNumber,
        contributionDate: normalizeDate(body.paymentDate),
        receivedById: session.userId,
        receivedByName: body.receivedBy || null,
        notes: noteParts.join('; '),
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
        issuedTo: memberName,
      },
    });

    await logFinanceActivity(session.branchId, session.userId, 'Welfare payment recorded', `${item.currency} ${body.amount.toFixed(2)} received from ${memberName}.`, 'FINANCE_WELFARE');
    await createAuditLog({
      branchId: session.branchId,
      userId: session.userId,
      action: 'WELFARE_PAYMENT_CREATE',
      entity: 'Contribution',
      entityId: item.id,
      module: 'finance',
      newValue: { amount: item.amount, currency: item.currency, memberId: person.id, paymentType: body.paymentType },
      ...auditMetaFromRequest(req),
    });
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to record welfare payment', 500);
  }
}
