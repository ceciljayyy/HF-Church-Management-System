import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { logFinanceActivity, makeNumber, normalizeDate, toNumber } from '@/lib/finance';

const pledgeSchema = z.object({
  title: z.string().min(1),
  contributorId: z.string().optional().nullable(),
  contributorName: z.string().min(1),
  fundId: z.string().min(1),
  targetAmount: z.coerce.number().positive(),
  amountPaid: z.coerce.number().nonnegative().optional().default(0),
  currency: z.string().default('GHS'),
  startDate: z.string().min(1),
  dueDate: z.string().min(1),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
});

async function getSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

function normalizeEnum(value: string | undefined, fallback: string) {
  return (value || fallback).trim().toUpperCase().replaceAll(' ', '_');
}

function pledgeStatus(targetAmount: number, amountPaid: number, dueDate: Date) {
  if (amountPaid >= targetAmount) return 'COMPLETED';
  if (dueDate < new Date()) return 'OVERDUE';
  return 'ACTIVE';
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const status = url.searchParams.get('status')?.trim();
  const fundId = url.searchParams.get('fundId')?.trim();
  const where: any = { branchId: session.branchId, deletedAt: null };
  if (status) where.status = normalizeEnum(status, 'ACTIVE');
  if (fundId) where.fundId = fundId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { contributorName: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.pledge.findMany({
    where,
    include: { fund: true, payments: true },
    orderBy: { createdAt: 'desc' },
  });

  return success({
    items: items.map((item) => {
      const amountPaid = item.payments.reduce((total, payment) => total + toNumber(payment.amount), 0);
      const targetAmount = toNumber(item.targetAmount);
      const balance = Math.max(targetAmount - amountPaid, 0);
      return {
        ...item,
        fundName: item.fund?.name ?? 'Unassigned',
        targetAmount,
        amountPaid,
        balance,
        progress: targetAmount > 0 ? Math.round((amountPaid / targetAmount) * 100) : 0,
        status: pledgeStatus(targetAmount, amountPaid, item.dueDate),
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    const body = pledgeSchema.parse(await req.json());
    const dueDate = normalizeDate(body.dueDate);
    const status = pledgeStatus(body.targetAmount, body.amountPaid, dueDate) as any;

    const item = await prisma.pledge.create({
      data: {
        branchId: session.branchId,
        pledgeNumber: makeNumber('PLG'),
        title: body.title.trim(),
        contributorId: body.contributorId || null,
        contributorName: body.contributorName.trim(),
        fundId: body.fundId,
        targetAmount: body.targetAmount,
        currency: body.currency || 'GHS',
        startDate: normalizeDate(body.startDate),
        dueDate,
        status,
        note: body.note || null,
        payments: body.amountPaid > 0 ? {
          create: {
            branchId: session.branchId,
            amount: body.amountPaid,
            currency: body.currency || 'GHS',
            paymentMethod: normalizeEnum(body.paymentMethod, 'CASH') as any,
            paymentDate: new Date(),
            reference: makeNumber('PLP'),
            receivedById: session.userId,
            receivedByName: session.email,
          },
        } : undefined,
      },
      include: { fund: true, payments: true },
    });

    await logFinanceActivity(session.branchId, session.userId, 'Pledge created', `${item.contributorName} pledged ${item.currency} ${body.targetAmount.toFixed(2)} for ${item.fund?.name ?? item.title}.`, 'FINANCE_PLEDGE');
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to create pledge', 500);
  }
}
