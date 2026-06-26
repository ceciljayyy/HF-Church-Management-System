import { NextRequest } from 'next/server';
import { z } from 'zod';
import { failure, success } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { getSmsSettings } from '@/lib/communications/sms/sms-provider.factory';
import { sendSms } from '@/lib/communications/sms/sms.service';
import { normalizeGhanaPhone } from '@/lib/phone';
import { getAuthedSession, requireBranchId } from '@/lib/people';
import { hasAnyPermission } from '@/lib/rbac';

const schema = z.object({
  phone: z.string().trim().min(1),
  message: z.string().trim().min(1).default('Test SMS from Holy Family CMS.'),
});

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasAnyPermission(session.permissions, ['communications.sendSms', 'settings.updateCommunications'])) return failure('Forbidden', 403);

  try {
    const input = schema.parse(await req.json());
    const branchId = await requireBranchId(session.branchId);
    const phone = normalizeGhanaPhone(input.phone);
    if (!phone) return failure('Invalid phone number', 422);
    const settings = await getSmsSettings(branchId);
    const result = await sendSms({ branchId, to: phone, message: input.message, purpose: 'TEST', sentByUserId: session.userId });

    await writeAuditLog({
      branchId,
      userId: session.userId,
      action: 'sms_test.sent',
      entity: 'CommunicationLog',
      newValue: { phone, success: result.success },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    if (!result.success) return failure(result.errorMessage ?? 'SMS provider is not configured yet.', 400);
    return success({
      success: true,
      message: settings.provider === 'mock' ? 'Mock SMS sent successfully. No real SMS was sent.' : 'Test SMS sent successfully.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure('Unable to send test SMS', 500, error);
  }
}
