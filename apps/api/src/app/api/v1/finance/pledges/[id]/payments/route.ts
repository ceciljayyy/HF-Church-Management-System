import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { logFinanceActivity, makeNumber, normalizeDate, toNumber } from '@/lib/finance';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { invalidateReportsCache } from '@/lib/cache-invalidation';

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().default('GHS'),
  paymentMethod: z.string().default('CASH'),
  paymentDate: z.string().optional(),
  reference: z.string().optional(),
  receivedBy: z.string().optional(),
});

function normalizeEnum(value: string | undefined, fallback: string) {
  return (value || fallback).trim().toUpperCase().replaceAll(' ', '_');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return failure('Unauthorized', 401);
    const session = await verifySessionToken(token);
    const { id } = await params;
    const body = paymentSchema.parse(await req.json());

    const pledge = await prisma.pledge.findFirst({
      where: { id, branchId: session.branchId, deletedAt: null },
      include: { payments: true },
    });
    if (!pledge) return failure('Pledge not found', 404);

    const payment = await prisma.pledgePayment.create({
      data: {
        branchId: session.branchId,
        pledgeId: pledge.id,
        amount: body.amount,
        currency: body.currency || pledge.currency,
        paymentMethod: normalizeEnum(body.paymentMethod, 'CASH') as any,
        paymentDate: body.paymentDate ? normalizeDate(body.paymentDate) : new Date(),
        reference: body.reference || makeNumber('PLP'),
        receivedById: session.userId,
        receivedByName: body.receivedBy || session.email,
      },
    });

    const totalPaid = pledge.payments.reduce((total, item) => total + toNumber(item.amount), 0) + body.amount;
    if (totalPaid >= toNumber(pledge.targetAmount)) {
      await prisma.pledge.update({ where: { id: pledge.id }, data: { status: 'COMPLETED' } });
    }

    await logFinanceActivity(session.branchId, session.userId, 'Pledge payment received', `${payment.currency} ${body.amount.toFixed(2)} received for ${pledge.title}.`, 'FINANCE_PLEDGE_PAYMENT');
    await invalidateReportsCache(session.branchId);
    return success({ item: payment }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to add pledge payment', 500);
  }
}
