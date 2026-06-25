import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { logFinanceActivity, makeNumber, normalizeDate } from '@/lib/finance';
import { invalidateReportsCache } from '@/lib/cache-invalidation';
import { hasPermission } from '@/lib/rbac';

const contributionSchema = z.object({
  contributorId: z.string().optional().nullable(),
  contributorName: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  type: z.string().optional(),
  contributionType: z.string().optional(),
  fundId: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().default('GHS'),
  paymentMethod: z.string().default('CASH'),
  paymentReference: z.string().optional(),
  contributionDate: z.string().min(1),
  receivedBy: z.string().optional(),
  note: z.string().optional(),
});

async function getSession(req: NextRequest) {
  return getRequestSession(req);
}

function normalizeEnum(value: string | undefined, fallback: string) {
  return (value || fallback).trim().toUpperCase().replaceAll(' ', '_');
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'finance.view')) return failure('Forbidden', 403);

  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
  const search = url.searchParams.get('search')?.trim();
  const type = url.searchParams.get('type')?.trim();
  const fundId = url.searchParams.get('fundId')?.trim();
  const paymentMethod = url.searchParams.get('paymentMethod')?.trim();
  const status = url.searchParams.get('status')?.trim();

  const where: any = { branchId: session.branchId, deletedAt: null };
  if (type) where.type = normalizeEnum(type, 'OFFERING');
  if (fundId) where.fundId = fundId;
  if (paymentMethod) where.paymentMethod = normalizeEnum(paymentMethod, 'CASH');
  if (status) where.status = normalizeEnum(status, 'RECORDED');
  if (search) {
    where.OR = [
      { contributorName: { contains: search, mode: 'insensitive' } },
      { reference: { contains: search, mode: 'insensitive' } },
      { paymentReference: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.contribution.findMany({
      where,
      include: { fund: true, person: true, receivedBy: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { contributionDate: 'desc' },
    }),
    prisma.contribution.count({ where }),
  ]);

  return success({
    items: items.map((item) => ({
      ...item,
      fundName: item.fund?.name ?? 'Unassigned',
      contributorName: item.isAnonymous
        ? 'Anonymous'
        : item.contributorName ?? (item.person ? `${item.person.firstName ?? ''} ${item.person.lastName ?? ''}`.trim() : 'Unknown'),
      receivedByName: item.receivedByName ?? item.receivedBy?.name ?? 'Unassigned',
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'finance.view')) return failure('Forbidden', 403);

    const body = contributionSchema.parse(await req.json());
    if (!body.isAnonymous && !body.contributorName?.trim() && !body.contributorId) {
      return failure('Contributor is required unless anonymous is enabled.', 422);
    }

    const contributionNumber = makeNumber('CON');
    const receiptNumber = makeNumber('RCT');
    const type = normalizeEnum(body.contributionType ?? body.type, 'OFFERING') as any;
    const paymentMethod = normalizeEnum(body.paymentMethod, 'CASH') as any;
    const contributorName = body.isAnonymous ? 'Anonymous' : body.contributorName?.trim() || null;

    const item = await prisma.contribution.create({
      data: {
        branchId: session.branchId,
        contributionNumber,
        personId: body.contributorId || null,
        contributorName,
        isAnonymous: body.isAnonymous,
        type,
        fundId: body.fundId,
        amount: body.amount,
        currency: body.currency || 'GHS',
        paymentMethod,
        paymentReference: body.paymentReference || null,
        reference: body.paymentReference || contributionNumber,
        contributionDate: normalizeDate(body.contributionDate),
        receivedById: session.userId,
        receivedByName: body.receivedBy || null,
        notes: body.note || null,
        receiptNumber,
        status: 'RECORDED',
      },
      include: { fund: true, person: true, receivedBy: true },
    });

    await prisma.receipt.create({
      data: {
        branchId: session.branchId,
        receiptNumber,
        contributionId: item.id,
        amount: item.amount,
        currency: item.currency,
        issuedTo: item.isAnonymous ? 'Anonymous' : item.contributorName ?? 'Contributor',
      },
    });

    await logFinanceActivity(session.branchId, session.userId, 'Contribution recorded', `${item.currency} ${body.amount.toFixed(2)} received for ${item.fund?.name ?? 'a fund'}.`, 'FINANCE_CONTRIBUTION');
    await invalidateReportsCache(session.branchId);

    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to create contribution', 500);
  }
}
