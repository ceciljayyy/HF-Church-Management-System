import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { createCommunicationLog } from '@/lib/communications/communication-log';
import { sendSms } from '@/lib/communications/sms/sms.service';
import { normalizeGhanaPhone } from '@/lib/phone';
import { getAuthedSession, requireBranchId } from '@/lib/people';
import { hasPermission } from '@/lib/rbac';

const schema = z.object({
  personIds: z.array(z.string()).default([]),
  phoneNumbers: z.array(z.string()).default([]),
  message: z.string().trim().min(1),
  purpose: z.enum(['BIRTHDAY', 'EVENT', 'WELFARE', 'ANNOUNCEMENT', 'TEST']).default('ANNOUNCEMENT'),
});

type SmsRecipient = {
  personId?: string;
  name?: string;
  rawPhone?: string | null;
  blocked: boolean;
};

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'communications.sendSms')) return failure('Forbidden', 403);

  try {
    const input = schema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    const people = input.personIds.length
      ? await prisma.person.findMany({
          where: { branchId, id: { in: input.personIds }, deletedAt: null },
          select: { id: true, firstName: true, lastName: true, phone: true, mobilePhone: true, doNotContact: true, allowSms: true },
        })
      : [];
    const recipients: SmsRecipient[] = [
      ...people.map((person) => ({
        personId: person.id,
        name: `${person.firstName} ${person.lastName}`,
        rawPhone: person.mobilePhone ?? person.phone,
        blocked: person.doNotContact || !person.allowSms,
      })),
      ...input.phoneNumbers.map((phone) => ({ rawPhone: phone, blocked: false })),
    ];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const recipient of recipients) {
      const phone = normalizeGhanaPhone(recipient.rawPhone);
      if (!phone || recipient.blocked) {
        skipped += 1;
        await createCommunicationLog({
          branchId,
          channel: 'SMS',
          purpose: input.purpose,
          recipientPersonId: recipient.personId,
          recipientName: recipient.name,
          recipientPhone: recipient.rawPhone,
          message: input.message,
          status: 'SKIPPED',
          errorMessage: recipient.blocked ? 'Recipient cannot receive SMS' : 'Invalid phone number',
          sentByUserId: session.userId,
        });
        continue;
      }
      const result = await sendSms({
        branchId,
        to: phone,
        message: input.message,
        purpose: input.purpose,
        recipientPersonId: recipient.personId,
        recipientName: recipient.name,
        sentByUserId: session.userId,
      });
      if (result.success) sent += 1;
      else failed += 1;
    }

    return success({ sent, failed, skipped });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to send SMS', 500, error);
  }
}
