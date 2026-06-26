import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { writeActivityLog, writeAuditLog } from '@/lib/audit';
import { createCommunicationLog } from '@/lib/communications/communication-log';
import { sendSms } from '@/lib/communications/sms/sms.service';
import { defaultBirthdayMessage } from '@/lib/communications/sms/sms-provider.factory';
import { normalizeGhanaPhone } from '@/lib/phone';
import { getAuthedSession, requireBranchId } from '@/lib/people';
import { hasPermission } from '@/lib/rbac';

const smsSchema = z.object({
  personIds: z.array(z.string()).min(1),
  message: z.string().trim().min(1).default(defaultBirthdayMessage),
});

function nameOf(person: { firstName: string; middleName?: string | null; lastName: string }) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');
}

function renderTemplate(template: string, person: { firstName: string; lastName: string; dateOfBirth: Date | null }, churchName: string) {
  const birthdayDate = person.dateOfBirth
    ? person.dateOfBirth.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })
    : '';
  return template
    .replaceAll('{firstName}', person.firstName)
    .replaceAll('{lastName}', person.lastName)
    .replaceAll('{fullName}', `${person.firstName} ${person.lastName}`)
    .replaceAll('{churchName}', churchName)
    .replaceAll('{birthdayDate}', birthdayDate);
}

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'people.sendBirthdaySms') && !hasPermission(session.permissions, 'communications.sendBirthdaySms')) {
    return failure('You do not have permission to send birthday messages.', 403);
  }

  try {
    const { personIds, message } = smsSchema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    const [people, profile] = await Promise.all([
      prisma.person.findMany({
        where: { branchId, id: { in: personIds }, deletedAt: null },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          dateOfBirth: true,
          phone: true,
          mobilePhone: true,
          allowSms: true,
          allowBirthdaySms: true,
          doNotContact: true,
        },
      }),
      prisma.churchProfile.findUnique({ where: { branchId }, select: { churchName: true } }),
    ]);
    const churchName = profile?.churchName ?? 'Holy Family';
    const results: Array<{ personId?: string; fullName?: string; status: string; reason?: string }> = [];

    for (const person of people) {
      const fullName = nameOf(person);
      const rawPhone = person.mobilePhone ?? person.phone;
      const phone = normalizeGhanaPhone(rawPhone);
      const skippedReason =
        !rawPhone ? 'Missing phone number'
        : !phone ? 'Invalid phone number'
        : person.doNotContact ? 'Do not contact enabled'
        : !person.allowSms ? 'SMS not allowed'
        : !person.allowBirthdaySms ? 'Birthday SMS not allowed'
        : null;

      if (skippedReason) {
        await createCommunicationLog({
          branchId,
          channel: 'SMS',
          purpose: 'BIRTHDAY',
          recipientPersonId: person.id,
          recipientName: fullName,
          recipientPhone: rawPhone ?? null,
          message,
          status: 'SKIPPED',
          errorMessage: skippedReason,
          sentByUserId: session.userId,
        });
        results.push({ personId: person.id, fullName, status: 'SKIPPED', reason: skippedReason });
        continue;
      }

      const renderedMessage = renderTemplate(message, person, churchName);
      const result = await sendSms({
        branchId,
        to: phone!,
        message: renderedMessage,
        purpose: 'BIRTHDAY',
        recipientPersonId: person.id,
        recipientName: fullName,
        sentByUserId: session.userId,
      });
      results.push({ personId: person.id, fullName, status: result.success ? result.status : 'FAILED', reason: result.errorMessage });
    }

    const sent = results.filter((result) => result.status === 'SENT' || result.status === 'MOCK_SENT').length;
    const failed = results.filter((result) => result.status === 'FAILED').length;
    const skipped = results.filter((result) => result.status === 'SKIPPED').length;

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'birthday_sms.sent',
      entity: 'CommunicationLog',
      newValue: { requested: personIds.length, sent, failed, skipped },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });
    await writeActivityLog({
      branchId,
      userId: session.userId,
      title: 'Birthday SMS sent',
      description: `Sent birthday SMS to ${sent} celebrants.`,
      type: 'communications.sms.birthday',
    });

    return success({ sent, failed, skipped, results, message: 'Birthday SMS completed.' });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to send birthday SMS. Please try again.', 500, error);
  }
}
