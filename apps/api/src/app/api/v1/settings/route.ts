import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']).default('JSON'),
});

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);
  const items = await prisma.setting.findMany({
    where: { branchId: session.branchId },
    orderBy: { key: 'asc' },
  });
  return success({ items });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    const body = settingSchema.parse(await req.json());
    const item = await prisma.setting.upsert({
      where: { branchId_key: { branchId: session.branchId, key: body.key } },
      update: { value: body.value as any, type: body.type },
      create: { branchId: session.branchId, key: body.key, value: body.value as any, type: body.type },
    });
    return success({ item });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to save setting', 500);
  }
}

export const PATCH = POST;
