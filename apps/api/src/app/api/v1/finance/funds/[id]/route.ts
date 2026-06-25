import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { hasPermission } from '@/lib/rbac';

const updateSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  targetAmount: z.coerce.number().nonnegative().optional(),
  status: z.string().optional(),
});

async function getSession(req: NextRequest) {
  return getRequestSession(req);
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'funds.view')) return failure('Forbidden', 403);
  const { id } = await context.params;
  const item = await prisma.financialFund.findFirst({
    where: { id, branchId: session.branchId },
    include: { contributions: { where: { deletedAt: null } }, expenses: { where: { deletedAt: null } } },
  });
  if (!item) return failure('Fund not found', 404);
  return success({ item });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'funds.update')) return failure('Forbidden', 403);
    const { id } = await context.params;
    const body = updateSchema.parse(await req.json());
    const existing = await prisma.financialFund.findFirst({ where: { id, branchId: session.branchId } });
    if (!existing) return failure('Fund not found', 404);
    const item = await prisma.financialFund.update({
      where: { id },
      data: {
        name: body.title ?? body.name,
        description: body.description,
        openingBalance: body.targetAmount,
        status: body.status as any,
        isActive: body.status ? body.status === 'ACTIVE' : undefined,
      },
    });
    return success({ item });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to update fund', 500);
  }
}
