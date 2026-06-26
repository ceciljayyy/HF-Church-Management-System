import { NextRequest } from 'next/server';
import { success, failure } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { canImportPeople, getAuthedSession, requireBranchId } from '@/lib/people';

const columns = [
  'First Name',
  'Last Name',
  'Gender',
  'Phone',
  'Email',
  'Address',
  'Classification',
  'Membership Date',
  'Date of Birth',
  'Department',
  'WhatsApp Number',
  'Preferred Communication Channel',
  'Allow SMS',
  'Allow Birthday SMS',
  'Allow WhatsApp',
  'Allow Birthday WhatsApp',
  'Do Not Contact',
  'Notes',
];

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canImportPeople(session.permissions)) return failure('Forbidden', 403);

  const branchId = await requireBranchId(session.branchId);
  await writeAuditLog({
    branchId,
    userId: session.userId,
    action: 'import.template.downloaded',
    entity: 'Person',
    newValue: { columns },
    ipAddress: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });

  return success({
    fileName: 'people-import-template.csv',
    content: `${columns.join(',')}\nAma,Boateng,Female,0240000001,ama@example.com,Dansoman,Member,2026-06-13,1995-04-02,Choir,0240000001,SMS,Yes,Yes,No,No,No,Choir member\n`,
  });
}
