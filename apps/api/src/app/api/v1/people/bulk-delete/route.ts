import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { hasPermission } from '@/lib/rbac';
import { writeActivityLog, writeAuditLog } from '@/lib/audit';
import { invalidatePeopleCache } from '@/lib/cache-invalidation';
import { getAuthedSession, requireBranchId } from '@/lib/people';

const bulkDeleteSchema = z.object({
  personIds: z.array(z.string()).min(1),
  mode: z.enum(['archive', 'hardDelete']).default('archive'),
});

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'people.archive')) return failure('Forbidden', 403);

  try {
    const { personIds, mode } = bulkDeleteSchema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);

    if (mode === 'hardDelete' && !hasPermission(session.permissions, 'admin.*')) {
      return failure('Only Super Admin can hard delete people', 403);
    }

    const where = { id: { in: personIds }, branchId };
    const result =
      mode === 'hardDelete'
        ? await prisma.person.deleteMany({ where })
        : await prisma.person.updateMany({ where, data: { deletedAt: new Date() } });

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: mode === 'hardDelete' ? 'bulk.delete' : 'bulk.archive',
      entity: 'Person',
      newValue: { personIds, count: result.count },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });
    await writeActivityLog({
      branchId,
      userId: session.userId,
      title: mode === 'hardDelete' ? 'People deleted' : 'People archived',
      description: `${result.count} people ${mode === 'hardDelete' ? 'deleted' : 'archived'}.`,
      type: mode === 'hardDelete' ? 'people.bulk-delete' : 'people.bulk-archive',
    });

    await invalidatePeopleCache(branchId);
    return success({ count: result.count, mode });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to complete bulk action', 500, error);
  }
}
