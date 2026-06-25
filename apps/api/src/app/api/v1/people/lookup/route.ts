import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { canReadPeople, getAuthedSession, requireBranchId } from '@/lib/people';

function fullName(person: { firstName: string; middleName?: string | null; lastName: string; preferredName?: string | null }) {
  return person.preferredName || [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');
}

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canReadPeople(session.permissions)) return failure('Forbidden', 403);

  try {
    const branchId = await requireBranchId(session.branchId);
    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim();
    const membersOnly = url.searchParams.get('membersOnly') === 'true' || url.searchParams.get('includeMembersOnly') === 'true';
    const includeDepartments = url.searchParams.get('includeDepartments') === 'true';

    const where: any = { branchId, deletedAt: null };
    if (membersOnly) where.member = { is: { deletedAt: null } };
    if (search) {
      where.OR = [
        'firstName',
        'middleName',
        'lastName',
        'preferredName',
        'email',
        'phone',
        'mobilePhone',
      ].map((field) => ({ [field]: { contains: search, mode: 'insensitive' } }));
      where.OR.push({ member: { membershipNumber: { contains: search, mode: 'insensitive' } } });
    }

    const people = await prisma.person.findMany({
      where,
      include: {
        member: true,
        groupMemberships: includeDepartments
          ? { where: { group: { type: 'DEPARTMENT', deletedAt: null } }, include: { group: true } }
          : false,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 100,
    });

    return success({
      items: people.map((person) => ({
        id: person.id,
        personId: person.id,
        memberId: person.member?.id ?? null,
        membershipNumber: person.member?.membershipNumber ?? null,
        fullName: fullName(person),
        firstName: person.firstName,
        lastName: person.lastName,
        phone: person.mobilePhone ?? person.phone ?? null,
        email: person.email,
        status: person.deletedAt ? 'ARCHIVED' : 'ACTIVE',
        membershipStatus: person.member?.status ?? null,
        departments: includeDepartments
          ? (person.groupMemberships as any[]).map((membership) => ({
              id: membership.groupId,
              name: membership.group.name,
              position: membership.status,
              isLeader: membership.role === 'HEAD',
            }))
          : [],
      })),
    });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Unable to load people lookup', 500);
  }
}
