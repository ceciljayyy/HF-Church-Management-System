import { z } from 'zod';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { hashPassword } from '@/lib/auth';

const userSchema = z.object({
  branchId: z.string().cuid(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  avatarUrl: z.string().url().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

const userUpdateSchema = userSchema.partial().extend({ id: z.string().cuid() });

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (id) {
    const item = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        branch: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!item) return failure('Record not found', 404);
    return success({ item });
  }

  const items = await prisma.user.findMany({
    select: {
      id: true,
      branchId: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      branch: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return success({ items });
}

export async function POST(req: NextRequest) {
  try {
    const body = userSchema.parse(await req.json());
    const item = await prisma.user.create({
      data: {
        branchId: body.branchId,
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        avatarUrl: body.avatarUrl,
        status: body.status ?? 'ACTIVE',
      },
    });
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to create user', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = userUpdateSchema.parse(await req.json());
    const item = await prisma.user.update({
      where: { id: body.id },
      data: {
        branchId: body.branchId,
        name: body.name,
        email: body.email,
        avatarUrl: body.avatarUrl,
        status: body.status,
        ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}),
      },
    });
    return success({ item });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to update user', 500);
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return failure('Missing id', 400);

  const item = await prisma.user.update({
    where: { id },
    data: { status: 'ARCHIVED', deletedAt: new Date() },
  });

  return success({ item });
}
