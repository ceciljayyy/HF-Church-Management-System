import { NextRequest } from 'next/server';
import { z } from 'zod';
import { importPeopleRowSchema } from '@church/shared';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { writeActivityLog, writeAuditLog } from '@/lib/audit';
import { invalidatePeopleCache } from '@/lib/cache-invalidation';
import {
  canImportPeople,
  createPersonWithMembership,
  getAuthedSession,
  normalizeImportRow,
  requireBranchId,
} from '@/lib/people';

const importRequestSchema = z.object({
  rows: z.array(z.unknown()).default([]),
});

function isEmptyRow(row: unknown) {
  return (
    typeof row === 'object' &&
    row !== null &&
    Object.values(row).every((value) => String(value ?? '').trim() === '')
  );
}

async function findDuplicate(input: { email?: string; phone?: string; mobilePhone?: string }, branchId: string) {
  const checks = [
    input.email ? { email: input.email } : null,
    input.phone ? { phone: input.phone } : null,
    input.mobilePhone ? { mobilePhone: input.mobilePhone } : null,
  ].filter(Boolean);

  if (!checks.length) return null;
  return prisma.person.findFirst({
    where: {
      branchId,
      deletedAt: null,
      OR: checks as any[],
    },
    select: { id: true },
  });
}

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canImportPeople(session.permissions)) return failure('Forbidden', 403);

  try {
    const { rows } = importRequestSchema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors: Array<{ row: number; message: string }> = [];

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'import.started',
      entity: 'Person',
      newValue: { totalRows: rows.length },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    for (const [index, rawRow] of rows.entries()) {
      const rowNumber = index + 1;
      if (isEmptyRow(rawRow)) {
        skipped += 1;
        continue;
      }

      const parsed = importPeopleRowSchema.safeParse(rawRow);
      if (!parsed.success) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          message: parsed.error.issues[0]?.message ?? 'Invalid row',
        });
        continue;
      }

      const input = normalizeImportRow(parsed.data);
      const duplicate = await findDuplicate(input, branchId);
      if (duplicate) {
        skipped += 1;
        duplicates += 1;
        errors.push({ row: rowNumber, message: 'Duplicate person by email or phone' });
        continue;
      }

      try {
        await createPersonWithMembership(input, branchId);
        imported += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Unable to import row',
        });
      }
    }

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'import.completed',
      entity: 'Person',
      newValue: { totalRows: rows.length, imported, skipped, duplicates },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    await writeActivityLog({
      branchId,
      userId: session.userId,
      title: 'People import completed',
      description: `${imported} imported, ${skipped} skipped, ${duplicates} duplicates.`,
      type: 'people.import',
    });

    if (imported > 0) await invalidatePeopleCache(branchId);

    return success({
      totalRows: rows.length,
      imported,
      skipped,
      duplicates,
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to import people', 500, error);
  }
}
