import { prisma } from './prisma';

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
  month?: number;
  week?: 'thisWeek' | 'nextWeek' | 'month';
  ageMin?: number;
  ageMax?: number;
  classification?: string;
  gender?: string;
  search?: string;
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

function matchesWeek(daysUntilBirthday: number, week?: BirthdayFilters['week']) {
  if (!week || week === 'month') return true;
  if (week === 'thisWeek') return daysUntilBirthday <= 7;
  if (week === 'nextWeek') return daysUntilBirthday > 7 && daysUntilBirthday <= 14;
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
    },
  });

  return people
    .map((person) => {
      const dateOfBirth = person.dateOfBirth as Date;
      const birthdayMonth = dateOfBirth.getUTCMonth() + 1;
      const birthdayDay = dateOfBirth.getUTCDate();
      const name = fullName(person);
      const age = calculateAge(dateOfBirth, today);
      const daysUntilBirthday = calculateDaysUntilBirthday(dateOfBirth, today);

      return {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: name,
        phone: person.mobilePhone ?? person.phone ?? null,
        email: person.email,
        gender: genderLabel(person.gender),
        classification: person.classification ?? 'Unassigned',
        dateOfBirth: dateOfBirth.toISOString().slice(0, 10),
        birthdayLabel: dateLabel(dateOfBirth),
        birthdayMonth,
        birthdayDay,
        month: birthdayMonth,
        monthName: monthNames[birthdayMonth - 1],
        day: birthdayDay,
        age,
        daysUntilBirthday,
        isToday: daysUntilBirthday === 0,
      };
    })
    .filter((person) => !filters.month || person.birthdayMonth === filters.month)
    .filter((person) => matchesWeek(person.daysUntilBirthday, filters.week))
    .filter((person) => filters.ageMin === undefined || person.age >= filters.ageMin)
    .filter((person) => filters.ageMax === undefined || person.age <= filters.ageMax)
    .filter((person) => {
      if (!search) return true;
      return [person.fullName, person.phone, person.email, person.classification, person.gender].some((value) =>
        value?.toLowerCase().includes(search),
      );
    })
    .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday || a.fullName.localeCompare(b.fullName));
}

export function groupCelebrantsByMonth(celebrants: Awaited<ReturnType<typeof getBirthdayCelebrants>>) {
  return monthNames
    .map((month, index) => ({
      month,
      monthName: month,
      monthNumber: index + 1,
      celebrants: celebrants
        .filter((person) => person.birthdayMonth === index + 1)
        .sort((a, b) => a.birthdayDay - b.birthdayDay || a.fullName.localeCompare(b.fullName)),
    }))
    .filter((group) => group.celebrants.length > 0);
}
