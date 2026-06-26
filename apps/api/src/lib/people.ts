import type { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import type { CreatePersonInput, ImportPeopleRowInput } from '@church/shared';
import { prisma } from './prisma';
import { getRequestSession } from './request-session';
import { hasAnyPermission, hasPermission } from './rbac';
import { writeAuditLog, writeActivityLog } from './audit';

const membershipClassifications = new Set(['Member', 'Leader', 'Pastor', 'Staff']);

export async function getAuthedSession(req: NextRequest) {
  return getRequestSession(req);
}

export async function requireBranchId(sessionBranchId?: string | null) {
  if (sessionBranchId) return sessionBranchId;
  const branch = await prisma.branch.findFirst({
    orderBy: [{ isMainBranch: 'desc' }, { createdAt: 'asc' }],
  });
  if (!branch) throw new Error('No branch is configured');
  return branch.id;
}

export function canReadPeople(permissions: string[]) {
  return hasPermission(permissions, 'people.view');
}

export function canCreatePeople(permissions: string[]) {
  return hasPermission(permissions, 'people.create');
}

export function canImportPeople(permissions: string[]) {
  return hasAnyPermission(permissions, ['people.import', 'people.create']);
}

export function normalizeClassification(value?: string | null) {
  const normalized = (value ?? '').trim().toLowerCase();
  const map: Record<string, string> = {
    member: 'Member',
    leader: 'Leader',
    pastor: 'Pastor',
    staff: 'Staff',
    visitor: 'Visitor',
    'first timer': 'First Timer',
    first_timer: 'First Timer',
    firsttimer: 'First Timer',
    'regular attendee': 'Regular Attendee',
    regular_attendee: 'Regular Attendee',
    unassigned: 'Unassigned',
    yes: 'Member',
    no: 'Visitor',
  };
  return map[normalized] ?? (value?.trim() || 'Unassigned');
}

export function qualifiesForMembership(classification?: string | null) {
  return membershipClassifications.has(normalizeClassification(classification));
}

export function normalizeGender(value?: string | null) {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (['male', 'm'].includes(normalized)) return 'MALE';
  if (['female', 'f'].includes(normalized)) return 'FEMALE';
  if (['prefer not to say', 'prefer_not_to_say', 'undisclosed'].includes(normalized)) {
    return 'PREFER_NOT_TO_SAY';
  }
  return 'OTHER';
}

export function nullableDate(value?: string | null) {
  if (!value) return null;
  const date = parseFlexibleDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function splitFullName(fullName?: string | null) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', middleName: null, lastName: '' };
  const firstName = parts[0] ?? '';
  const lastName = parts[parts.length - 1] ?? firstName;
  if (parts.length === 1) return { firstName, middleName: null, lastName: firstName };
  return {
    firstName,
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : null,
    lastName,
  };
}

export function normalizePhone(phone?: string | null) {
  const raw = (phone ?? '').trim();
  if (!raw) return null;
  let value = raw.replace(/[\s\-()+]/g, '');
  if (value.startsWith('233') && value.length === 12) value = `0${value.slice(3)}`;
  if (value.length === 9 && !value.startsWith('0')) value = `0${value}`;
  return value || null;
}

export function normalizeEmail(email?: string | null) {
  const value = (email ?? '').trim().toLowerCase();
  return value || null;
}

export function normalizeName(name?: string | null) {
  const value = (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return value ? value.replace(/\s/g, '') : null;
}

export function normalizeFullName(firstName?: string | null, lastName?: string | null) {
  return normalizeName([firstName, lastName].filter(Boolean).join(' '));
}

export function normalizeDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : parseFlexibleDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function parseFlexibleDate(value?: string | null) {
  const raw = (value ?? '').trim();
  if (!raw) return new Date(Number.NaN);

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));

  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return new Date(Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2])));

  return new Date(raw);
}

export function normalizeImportRow(row: ImportPeopleRowInput): CreatePersonInput {
  const split = splitFullName(row.fullName);
  return {
    firstName: row.firstName || split.firstName,
    middleName: row.middleName || split.middleName || undefined,
    lastName: row.lastName || split.lastName,
    gender: normalizeGender(row.gender) as CreatePersonInput['gender'],
    dateOfBirth: row.dateOfBirth,
    hideAge: false,
    mobilePhone: row.phone,
    phone: row.phone,
    email: row.email,
    address: row.address,
    occupation: row.occupation,
    classification: normalizeClassification(row.classification),
    membershipDate: row.membershipDate,
    whatsappNumber: row.whatsappNumber,
    preferredCommunicationChannel: row.preferredCommunicationChannel ?? 'SMS',
    allowSms: row.allowSms ?? true,
    allowBirthdaySms: row.allowBirthdaySms ?? true,
    allowEventSms: true,
    allowWelfareSms: true,
    allowWhatsApp: row.allowWhatsApp ?? false,
    allowBirthdayWhatsApp: row.allowBirthdayWhatsApp ?? false,
    doNotContact: row.doNotContact ?? false,
    notes: row.notes,
  };
}

export function personData(input: CreatePersonInput, branchId: string) {
  const primaryPhone = nullableText(input.mobilePhone) ?? nullableText(input.phone) ?? nullableText(input.homePhone);
  return {
    branchId,
    title: nullableText(input.title),
    firstName: input.firstName.trim(),
    middleName: nullableText(input.middleName),
    lastName: input.lastName.trim(),
    suffix: nullableText(input.suffix),
    gender: input.gender ?? null,
    dateOfBirth: nullableDate(input.dateOfBirth),
    hideAge: input.hideAge ?? false,
    phone: primaryPhone,
    homePhone: nullableText(input.homePhone),
    mobilePhone: nullableText(input.mobilePhone),
    workPhone: nullableText(input.workPhone),
    email: nullableText(input.email),
    otherEmail: nullableText(input.otherEmail),
    address: nullableText(input.address),
    occupation: nullableText(input.occupation),
    facebookUrl: nullableText(input.facebook),
    xUrl: nullableText(input.x),
    linkedinUrl: nullableText(input.linkedin),
    classification: normalizeClassification(input.classification),
    familyRole: nullableText(input.familyRole),
    friendDate: nullableDate(input.friendDate),
    whatsappNumber: nullableText(input.whatsappNumber),
    allowSms: input.allowSms ?? true,
    allowBirthdaySms: input.allowBirthdaySms ?? true,
    allowEventSms: input.allowEventSms ?? true,
    allowWelfareSms: input.allowWelfareSms ?? true,
    allowWhatsApp: input.allowWhatsApp ?? false,
    allowBirthdayWhatsApp: input.allowBirthdayWhatsApp ?? false,
    preferredCommunicationChannel: input.preferredCommunicationChannel ?? 'SMS',
    doNotContact: input.doNotContact ?? false,
    notes: nullableText(input.notes),
  };
}

async function nextMembershipNumber(tx: any, branchId: string) {
  const count = await tx.member.count({ where: { branchId } });
  for (let offset = 1; offset < 100; offset += 1) {
    const membershipNumber = `M-${String(count + offset).padStart(5, '0')}`;
    const existing = await tx.member.findUnique({ where: { membershipNumber } });
    if (!existing) return membershipNumber;
  }
  return `M-${Date.now()}`;
}

export async function createPersonWithMembership(input: CreatePersonInput, branchId: string) {
  return prisma.$transaction(
    async (tx) => {
      const created = await tx.person.create({
        data: personData(input, branchId),
        include: {
          member: true,
          familyMembers: { include: { family: true }, take: 1 },
        },
      });

      if (input.familyId) {
        await tx.familyMember.create({
          data: {
            familyId: input.familyId,
            personId: created.id,
            relationship: input.familyRole || 'Unassigned',
            isHeadOfFamily: input.familyRole === 'Head of Family',
          },
        });
      }

      if (qualifiesForMembership(input.classification)) {
        await tx.member.create({
          data: {
            branchId,
            personId: created.id,
            membershipNumber: await nextMembershipNumber(tx, branchId),
            status: 'ACTIVE',
            joinedAt: nullableDate(input.membershipDate),
            membershipType: 'OTHER',
          },
        });
      }

      if (input.departmentId) {
        const department = await tx.group.findFirst({
          where: { id: input.departmentId, branchId, type: 'DEPARTMENT', deletedAt: null },
        });
        if (department) {
          const role = input.departmentRoleType === 'HEAD' ? 'HEAD' : 'MEMBER';
          const position = nullableText(input.departmentPosition) ?? (role === 'HEAD' ? department.meetingDay ?? 'Head of Department' : 'Member');
          await tx.groupMember.upsert({
            where: { groupId_personId: { groupId: department.id, personId: created.id } },
            update: { role, status: position },
            create: { groupId: department.id, personId: created.id, role, status: position },
          });
          if (role === 'HEAD') {
            await tx.groupMember.updateMany({
              where: { groupId: department.id, role: 'HEAD', personId: { not: created.id } },
              data: { role: 'MEMBER' },
            });
            await tx.group.update({ where: { id: department.id }, data: { leaderId: created.id } });
          }
        }
      }

      return tx.person.findUnique({
        where: { id: created.id },
        include: {
          member: true,
          familyMembers: { include: { family: true }, take: 1 },
        },
      });
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}

export async function auditPersonCreate(req: NextRequest, branchId: string, userId: string, person: any) {
  await writeAuditLog({
    branchId,
    userId,
    action: 'create',
    entity: 'Person',
    entityId: person.id,
    newValue: {
      id: person.id,
      email: person.email,
      classification: person.classification,
    } satisfies Prisma.InputJsonObject,
    ipAddress: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });

  await writeActivityLog({
    branchId,
    userId,
    title: 'Person created',
    description: `${person.firstName} ${person.lastName} was added to People.`,
    type: 'people.create',
  });
}
