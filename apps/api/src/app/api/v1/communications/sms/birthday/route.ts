import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { writeActivityLog, writeAuditLog } from '@/lib/audit';
import { getAuthedSession, requireBranchId } from '@/lib/people';
import { hasPermission } from '@/lib/rbac';

const smsSchema = z.object({
  personIds: z.array(z.string()).min(1),
  message: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'people.update')) return failure('Forbidden', 403);

  try {
    const { personIds, message } = smsSchema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    const providerConfigured = Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY);

    const people = await prisma.person.findMany({
      where: { branchId, id: { in: personIds }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, phone: true, mobilePhone: true },
    });
    const recipientsWithPhone = people.filter((person) => person.mobilePhone || person.phone);

    if (!providerConfigured) {
      await writeAuditLog({
        branchId,
        userId: session.userId,
        action: 'birthday_sms.skipped',
        entity: 'CommunicationLog',
        newValue: { reason: 'SMS provider is not configured', requested: personIds.length, recipients: recipientsWithPhone.length },
        ipAddress: req.headers.get('x-forwarded-for'),
        userAgent: req.headers.get('user-agent'),
      });
      return failure('SMS provider is not configured yet.', 400);
    }

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'birthday_sms.sent',
      entity: 'CommunicationLog',
      newValue: { personIds, recipients: recipientsWithPhone.length, message },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });
    await writeActivityLog({
      branchId,
      userId: session.userId,
      title: 'Birthday SMS sent',
      description: `Sent birthday SMS to ${recipientsWithPhone.length} celebrants.`,
      type: 'communications.sms.birthday',
    });

    return success({ sent: recipientsWithPhone.length, skipped: people.length - recipientsWithPhone.length });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to send birthday SMS', 500, error);
  }
}
