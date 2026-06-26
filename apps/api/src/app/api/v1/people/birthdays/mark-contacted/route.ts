import { NextRequest } from 'next/server';
import { z } from 'zod';
import { failure, success } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { createCommunicationLog } from '@/lib/communications/communication-log';
import { getAuthedSession, requireBranchId } from '@/lib/people';
import { hasAnyPermission } from '@/lib/rbac';

const schema = z.object({
  personIds: z.array(z.string()).min(1),
  channel: z.enum(['CALL', 'SMS', 'WHATSAPP', 'MANUAL']).default('MANUAL'),
  note: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasAnyPermission(session.permissions, ['people.sendBirthdaySms', 'communications.sendBirthdaySms'])) return failure('Forbidden', 403);

  try {
    const input = schema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    const people = await prisma.person.findMany({
      where: { branchId, id: { in: input.personIds }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, phone: true, mobilePhone: true },
    });
    await Promise.all(people.map((person) =>
      createCommunicationLog({
        branchId,
        channel: input.channel,
        purpose: 'MANUAL',
        recipientPersonId: person.id,
        recipientName: `${person.firstName} ${person.lastName}`,
        recipientPhone: person.mobilePhone ?? person.phone,
        message: input.note || 'Birthday celebrant marked as contacted.',
        status: 'MANUAL',
        sentByUserId: session.userId,
        sentAt: new Date(),
      }),
    ));
    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'birthday_contact.marked',
      entity: 'CommunicationLog',
      newValue: { count: people.length, channel: input.channel },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });
    return success({ count: people.length });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to mark birthday celebrants as contacted', 500, error);
  }
}
