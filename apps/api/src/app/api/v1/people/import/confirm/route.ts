import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { writeActivityLog, writeAuditLog } from '@/lib/audit';
import { invalidatePeopleCache } from '@/lib/cache-invalidation';
import { canImportPeople, createPersonWithMembership, getAuthedSession, requireBranchId } from '@/lib/people';

const actionSchema = z.enum(['skip', 'create', 'update', 'importAnyway']);
const confirmRequestSchema = z.object({
  rows: z.array(
    z.object({
      rowNumber: z.number(),
      data: z.any().nullable(),
      status: z.enum(['ready', 'duplicate', 'error']),
      matchingPersonId: z.string().optional(),
      selectedAction: actionSchema.default('skip'),
    }),
  ),
});

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canImportPeople(session.permissions)) return failure('Forbidden', 403);

  try {
    const { rows } = confirmRequestSchema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (const row of rows) {
      if (!row.data || row.status === 'error' || row.selectedAction === 'skip') {
        skipped += 1;
        continue;
      }

      try {
        if (row.selectedAction === 'update') {
          if (!row.matchingPersonId) {
            skipped += 1;
            errors.push({ row: row.rowNumber, message: 'No matching person selected for update.' });
            continue;
          }
          await prisma.person.update({
            where: { id: row.matchingPersonId },
            data: {
              firstName: row.data.firstName,
              middleName: row.data.middleName ?? null,
              lastName: row.data.lastName,
              gender: row.data.gender ?? null,
              dateOfBirth: row.data.dateOfBirth ? new Date(row.data.dateOfBirth) : undefined,
              phone: row.data.mobilePhone ?? row.data.phone ?? undefined,
              mobilePhone: row.data.mobilePhone ?? row.data.phone ?? undefined,
              email: row.data.email ?? undefined,
              address: row.data.address ?? undefined,
              occupation: row.data.occupation ?? undefined,
              classification: row.data.classification ?? undefined,
              notes: row.data.notes ?? undefined,
            },
          });
          updated += 1;
        } else {
          await createPersonWithMembership(row.data, branchId);
          created += 1;
        }
      } catch (error) {
        skipped += 1;
        errors.push({
          row: row.rowNumber,
          message: error instanceof Error ? error.message : 'Unable to import row',
        });
      }
    }

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'import.completed',
      entity: 'Person',
      newValue: { totalRows: rows.length, created, updated, skipped, errors: errors.length },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    await writeActivityLog({
      branchId,
      userId: session.userId,
      title: 'People import completed',
      description: `${created} created, ${updated} updated, ${skipped} skipped.`,
      type: 'people.import',
    });

    if (created || updated) await invalidatePeopleCache(branchId);
    return success({ totalRows: rows.length, created, updated, skipped, errors });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to confirm import', 500, error);
  }
}
