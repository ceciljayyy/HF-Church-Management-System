import { NextRequest } from 'next/server';
import { z } from 'zod';
import { failure, success } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { buildPeopleImportPreview } from '@/lib/people-import';
import { canImportPeople, getAuthedSession, requireBranchId } from '@/lib/people';

const previewRequestSchema = z.object({
  rows: z.array(z.unknown()).default([]),
  fileName: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canImportPeople(session.permissions)) return failure('Forbidden', 403);

  try {
    const { rows, fileName } = previewRequestSchema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    const preview = await buildPeopleImportPreview(rows, branchId);

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'import.preview',
      entity: 'Person',
      newValue: {
        fileName,
        totalRows: preview.totalRows,
        validRows: preview.validRows,
        duplicateRows: preview.duplicateRows,
        errorRows: preview.errorRows,
      },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    return success(preview);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to preview import', 500, error);
  }
}
