import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { canReadPeople, getAuthedSession, normalizeDate, normalizeEmail, normalizeFullName, normalizePhone, requireBranchId } from '@/lib/people';

type DuplicatePerson = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  mobilePhone?: string | null;
  email?: string | null;
  dateOfBirth?: Date | null;
  createdAt: Date;
};

function displayName(person: DuplicatePerson) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');
}

function addGroup(groups: Map<string, { reason: string; matchValue: string; people: DuplicatePerson[] }>, reason: string, matchValue: string | null, person: DuplicatePerson) {
  if (!matchValue) return;
  const key = `${reason}:${matchValue}`;
  const group = groups.get(key) ?? { reason, matchValue, people: [] };
  if (!group.people.some((item) => item.id === person.id)) group.people.push(person);
  groups.set(key, group);
}

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canReadPeople(session.permissions)) return failure('Forbidden', 403);

  try {
    const branchId = await requireBranchId(session.branchId);
    const people = await prisma.person.findMany({
      where: { branchId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phone: true,
        mobilePhone: true,
        email: true,
        dateOfBirth: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const indexes = new Map<string, { reason: string; matchValue: string; people: DuplicatePerson[] }>();
    people.forEach((person) => {
      addGroup(indexes, 'Phone number already exists', normalizePhone(person.mobilePhone ?? person.phone), person);
      addGroup(indexes, 'Email already exists', normalizeEmail(person.email), person);
      addGroup(indexes, 'Name already exists', normalizeFullName(person.firstName, person.lastName), person);
      const fullName = normalizeFullName(person.firstName, person.lastName);
      const dob = normalizeDate(person.dateOfBirth);
      addGroup(indexes, 'Name and Date of Birth already exists', fullName && dob ? `${fullName}:${dob}` : null, person);
    });

    const groups = Array.from(indexes.values())
      .filter((group) => group.people.length > 1)
      .map((group, index) => ({
        id: `duplicate-${index + 1}`,
        reason: group.reason,
        matchValue: group.matchValue,
        people: group.people.map((person) => ({
          id: person.id,
          fullName: displayName(person),
          phone: person.mobilePhone ?? person.phone,
          email: person.email,
          dateOfBirth: person.dateOfBirth?.toISOString().slice(0, 10) ?? null,
          createdAt: person.createdAt,
        })),
      }));

    return success({ groups });
  } catch (error) {
    return failure('Unable to load duplicate people', 500, error);
  }
}
