import { prisma } from './prisma';
import { normalizeGhanaPhone } from './phone';

export const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

type BirthdayFilters = {
  filter?: 'today' | 'thisWeek' | 'thisMonth' | 'all';
  month?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  channel?: 'sms' | 'whatsapp' | 'both' | 'any';
  classification?: string;
  gender?: string;
};

function fullName(person: { firstName: string; middleName?: string | null; lastName: string; preferredName?: string | null }) {
  return [person.preferredName || person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');
}

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function birthdayThisYear(dateOfBirth: Date, today: Date) {
  return new Date(Date.UTC(today.getUTCFullYear(), dateOfBirth.getUTCMonth(), dateOfBirth.getUTCDate()));
}

export function calculateAge(dateOfBirth: Date, today = new Date()) {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const birthday = birthdayThisYear(dateOfBirth, today);
  if (startOfUtcDay(today) < startOfUtcDay(birthday)) age -= 1;
  return age;
}

export function calculateDaysUntilBirthday(dateOfBirth: Date, today = new Date()) {
  const todayStart = startOfUtcDay(today);
  let birthday = birthdayThisYear(dateOfBirth, today);
  if (startOfUtcDay(birthday) < todayStart) {
    birthday = new Date(Date.UTC(today.getUTCFullYear() + 1, dateOfBirth.getUTCMonth(), dateOfBirth.getUTCDate()));
  }
  return Math.round((startOfUtcDay(birthday) - todayStart) / 86_400_000);
}

function dateLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
}

function genderLabel(gender?: string | null) {
  if (!gender) return null;
  return gender
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizedGenderFilter(value?: string) {
  if (!value) return undefined;
  return value.trim().toUpperCase().replaceAll(' ', '_');
}

function matchesFilter(person: { month: number; day: number; daysUntilBirthday: number }, filter?: BirthdayFilters['filter']) {
  const today = new Date();
  if (!filter || filter === 'all') return true;
  if (filter === 'today') return person.daysUntilBirthday === 0;
  if (filter === 'thisWeek') return person.daysUntilBirthday >= 0 && person.daysUntilBirthday <= 7;
  if (filter === 'thisMonth') return person.month === today.getUTCMonth() + 1;
  return true;
}

function matchesChannel(person: { canReceiveSms: boolean; canReceiveWhatsApp: boolean }, channel?: BirthdayFilters['channel']) {
  if (!channel || channel === 'any') return true;
  if (channel === 'sms') return person.canReceiveSms;
  if (channel === 'whatsapp') return person.canReceiveWhatsApp;
  if (channel === 'both') return person.canReceiveSms && person.canReceiveWhatsApp;
  return true;
}

export async function getBirthdayCelebrants(branchId: string, filters: BirthdayFilters = {}) {
  const today = new Date();
  const search = filters.search?.trim().toLowerCase();
  const gender = normalizedGenderFilter(filters.gender);

  const people = await prisma.person.findMany({
    where: {
      branchId,
      deletedAt: null,
      dateOfBirth: { not: null },
      ...(filters.classification ? { classification: filters.classification } : {}),
      ...(gender ? { gender: gender as any } : {}),
      ...(filters.departmentId
        ? {
            groupMemberships: {
              some: { groupId: filters.departmentId, group: { type: 'DEPARTMENT', deletedAt: null } },
            },
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      preferredName: true,
      gender: true,
      dateOfBirth: true,
      phone: true,
      mobilePhone: true,
      email: true,
      classification: true,
      whatsappNumber: true,
      allowSms: true,
      allowBirthdaySms: true,
      allowWhatsApp: true,
      allowBirthdayWhatsApp: true,
      preferredCommunicationChannel: true,
      doNotContact: true,
      groupMemberships: {
        where: { group: { type: 'DEPARTMENT', deletedAt: null } },
        select: { group: { select: { id: true, name: true } } },
        take: 1,
      },
    },
  });

  const mapped = people.map((person) => {
    const dateOfBirth = person.dateOfBirth as Date;
    const month = dateOfBirth.getUTCMonth() + 1;
    const day = dateOfBirth.getUTCDate();
    const name = fullName(person);
    const phone = person.mobilePhone ?? person.phone ?? null;
    const normalizedSmsPhone = normalizeGhanaPhone(phone);
    const normalizedWhatsAppPhone = normalizeGhanaPhone(person.whatsappNumber ?? phone);
    const canReceiveSms = Boolean(!person.doNotContact && person.allowSms && person.allowBirthdaySms && normalizedSmsPhone);
    const canReceiveWhatsApp = Boolean(!person.doNotContact && person.allowWhatsApp && person.allowBirthdayWhatsApp && normalizedWhatsAppPhone);
    const department = person.groupMemberships[0]?.group;

    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      fullName: name,
      phone,
      whatsappNumber: person.whatsappNumber ?? null,
      email: person.email,
      gender: genderLabel(person.gender),
      classification: person.classification ?? 'Unassigned',
      dateOfBirth: dateOfBirth.toISOString().slice(0, 10),
      birthdayLabel: dateLabel(dateOfBirth),
      birthdayMonth: month,
      birthdayDay: day,
      month,
      monthName: monthNames[month - 1],
      day,
      age: calculateAge(dateOfBirth, today),
      daysUntilBirthday: calculateDaysUntilBirthday(dateOfBirth, today),
      isToday: calculateDaysUntilBirthday(dateOfBirth, today) === 0,
      departmentId: department?.id ?? null,
      departmentName: department?.name ?? null,
      preferredCommunicationChannel: person.preferredCommunicationChannel,
      canReceiveSms,
      canReceiveWhatsApp,
      doNotContact: person.doNotContact,
      allowSms: person.allowSms,
      allowBirthdaySms: person.allowBirthdaySms,
      allowWhatsApp: person.allowWhatsApp,
      allowBirthdayWhatsApp: person.allowBirthdayWhatsApp,
    };
  });

  const filtered = mapped
    .filter((person) => !filters.month || person.month === filters.month)
    .filter((person) => matchesFilter(person, filters.filter))
    .filter((person) => matchesChannel(person, filters.channel))
    .filter((person) => {
      if (!search) return true;
      return [person.fullName, person.phone, person.whatsappNumber, person.email, person.departmentName].some((value) =>
        value?.toLowerCase().includes(search),
      );
    })
    .sort((a, b) => a.month - b.month || a.day - b.day || a.fullName.localeCompare(b.fullName));

  return filters.limit && filters.limit > 0 ? filtered.slice(0, filters.limit) : filtered;
}

export function groupCelebrantsByMonth(celebrants: Awaited<ReturnType<typeof getBirthdayCelebrants>>, includeEmpty = true) {
  return monthNames.map((monthName, index) => {
    const month = index + 1;
    const people = celebrants
      .filter((person) => person.month === month)
      .sort((a, b) => a.day - b.day || a.fullName.localeCompare(b.fullName));
    return {
      month,
      monthNumber: month,
      monthName,
      label: monthName,
      count: people.length,
      celebrants: people,
    };
  }).filter((group) => includeEmpty || group.celebrants.length > 0);
}
