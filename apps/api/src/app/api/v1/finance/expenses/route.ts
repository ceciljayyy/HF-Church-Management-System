import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { logFinanceActivity, makeNumber, normalizeDate } from '@/lib/finance';

const expenseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  fundId: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().default('GHS'),
  paymentMethod: z.string().default('CASH'),
  vendorName: z.string().optional(),
  expenseDate: z.string().min(1),
  dueDate: z.string().optional(),
  requestedBy: z.string().optional(),
  receiptUrl: z.string().optional(),
  status: z.string().optional(),
});

async function getSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

function normalizeEnum(value: string | undefined, fallback: string) {
  return (value || fallback).trim().toUpperCase().replaceAll(' ', '_');
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);

  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
  const search = url.searchParams.get('search')?.trim();
  const category = url.searchParams.get('category')?.trim();
  const fundId = url.searchParams.get('fundId')?.trim();
  const status = url.searchParams.get('status')?.trim();
  const paymentMethod = url.searchParams.get('paymentMethod')?.trim();

  const where: any = { branchId: session.branchId, deletedAt: null };
  if (category) where.category = category;
  if (fundId) where.fundId = fundId;
  if (status) where.status = normalizeEnum(status, 'PENDING');
  if (paymentMethod) where.paymentMethod = normalizeEnum(paymentMethod, 'CASH');
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { vendorName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { fund: true, requestedBy: true, approvedBy: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.expense.count({ where }),
  ]);

  return success({
    items: items.map((item) => ({
      ...item,
      fundName: item.fund?.name ?? 'Unassigned',
      requestedByName: item.requestedByName ?? item.requestedBy?.name ?? 'Unassigned',
      approvedByName: item.approvedByName ?? item.approvedBy?.name ?? '',
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    const body = expenseSchema.parse(await req.json());
    const status = normalizeEnum(body.status, 'PENDING') as any;
    const paymentMethod = normalizeEnum(body.paymentMethod, 'CASH') as any;

    const item = await prisma.expense.create({
      data: {
        branchId: session.branchId,
        expenseNumber: makeNumber('EXP'),
        title: body.title.trim(),
        description: body.description || null,
        category: body.category,
        fundId: body.fundId,
        amount: body.amount,
        currency: body.currency || 'GHS',
        paymentMethod,
        vendorName: body.vendorName || null,
        expenseDate: normalizeDate(body.expenseDate),
        dueDate: body.dueDate ? normalizeDate(body.dueDate) : null,
        requestedById: session.userId,
        requestedByName: body.requestedBy || null,
        status,
        receiptUrl: body.receiptUrl || null,
      },
      include: { fund: true, requestedBy: true, approvedBy: true },
    });

    await logFinanceActivity(session.branchId, session.userId, 'Expense submitted', `${item.currency} ${body.amount.toFixed(2)} requested for ${item.title}.`, 'FINANCE_EXPENSE');
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to create expense', 500);
  }
}
