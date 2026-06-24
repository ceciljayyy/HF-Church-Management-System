import { importPeopleRowSchema, type ImportPeopleRowInput } from '@church/shared';
import { prisma } from './prisma';
import {
  normalizeDate,
  normalizeEmail,
  normalizeFullName,
  normalizeImportRow,
  normalizeName,
  normalizePhone,
  parseFlexibleDate,
  splitFullName,
} from './people';

export type ImportAction = 'skip' | 'create' | 'update' | 'importAnyway';

export type ImportPreviewRow = {
  rowNumber: number;
  rawData: unknown;
  data: ReturnType<typeof normalizeImportRow> | null;
  status: 'ready' | 'duplicate' | 'error';
  duplicateReason?: string;
  matchingPersonId?: string;
  matchingPersonName?: string;
  matchingField?: string;
  selectedAction: ImportAction;
  errorMessage?: string;
};

function isEmptyRow(row: unknown) {
  return (
    typeof row === 'object' &&
    row !== null &&
    Object.values(row).every((value) => String(value ?? '').trim() === '')
  );
}

function fullNameFromRow(row: ImportPeopleRowInput) {
  if (row.fullName) return row.fullName;
  return [row.firstName, row.lastName].filter(Boolean).join(' ');
}

function normalizedRow(row: ImportPeopleRowInput) {
  const split = splitFullName(row.fullName);
  const firstName = row.firstName || split.firstName;
  const lastName = row.lastName || split.lastName;
  return {
    phone: normalizePhone(row.phone),
    email: normalizeEmail(row.email),
    fullName: normalizeName(fullNameFromRow(row)),
    firstLastGender: normalizeFullName(firstName, lastName) && row.gender ? `${normalizeFullName(firstName, lastName)}:${row.gender.trim().toLowerCase()}` : null,
    fullNameDob: normalizeName(fullNameFromRow(row)) && row.dateOfBirth ? `${normalizeName(fullNameFromRow(row))}:${normalizeDate(row.dateOfBirth)}` : null,
  };
}

function validDateOrMessage(value?: string | null) {
  if (!value) return null;
  const date = parseFlexibleDate(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date. Use YYYY-MM-DD or MM/DD/YYYY.';
  return null;
}

function existingPersonName(person: { firstName: string; middleName?: string | null; lastName: string }) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');
}

export async function buildPeopleImportPreview(rows: unknown[], branchId: string) {
  const existing = await prisma.person.findMany({
    where: { branchId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      gender: true,
      dateOfBirth: true,
      email: true,
      phone: true,
      mobilePhone: true,
    },
  });

  const byPhone = new Map<string, (typeof existing)[number]>();
  const byEmail = new Map<string, (typeof existing)[number]>();
  const byName = new Map<string, (typeof existing)[number]>();
  const byFirstLastGender = new Map<string, (typeof existing)[number]>();
  const byNameDob = new Map<string, (typeof existing)[number]>();

  existing.forEach((person) => {
    const phones = [person.phone, person.mobilePhone].map(normalizePhone).filter(Boolean) as string[];
    phones.forEach((phone) => byPhone.set(phone, person));
    const email = normalizeEmail(person.email);
    if (email) byEmail.set(email, person);
    const name = normalizeFullName(person.firstName, person.lastName);
    if (name) byName.set(name, person);
    if (name && person.gender) byFirstLastGender.set(`${name}:${String(person.gender).toLowerCase()}`, person);
    const dob = normalizeDate(person.dateOfBirth);
    if (name && dob) byNameDob.set(`${name}:${dob}`, person);
  });

  const seen = {
    phone: new Map<string, number>(),
    email: new Map<string, number>(),
    fullName: new Map<string, number>(),
    firstLastGender: new Map<string, number>(),
    fullNameDob: new Map<string, number>(),
  };

  const previewRows: ImportPreviewRow[] = [];

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 1;
    if (isEmptyRow(rawRow)) return;

    const parsed = importPeopleRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      previewRows.push({
        rowNumber,
        rawData: rawRow,
        data: null,
        status: 'error',
        selectedAction: 'skip',
        errorMessage: parsed.error.issues[0]?.message ?? 'Invalid row',
      });
      return;
    }

    const dateError = validDateOrMessage(parsed.data.dateOfBirth) ?? validDateOrMessage(parsed.data.membershipDate);
    if (dateError) {
      previewRows.push({
        rowNumber,
        rawData: rawRow,
        data: null,
        status: 'error',
        selectedAction: 'skip',
        errorMessage: dateError,
      });
      return;
    }

    const normalized = normalizedRow(parsed.data);
    const duplicateInside =
      (normalized.phone && seen.phone.get(normalized.phone)) ||
      (normalized.email && seen.email.get(normalized.email)) ||
      (normalized.fullNameDob && seen.fullNameDob.get(normalized.fullNameDob)) ||
      (normalized.firstLastGender && seen.firstLastGender.get(normalized.firstLastGender)) ||
      (normalized.fullName && seen.fullName.get(normalized.fullName));

    const existingMatch =
      (normalized.phone && byPhone.get(normalized.phone)) ||
      (normalized.email && byEmail.get(normalized.email)) ||
      (normalized.fullNameDob && byNameDob.get(normalized.fullNameDob)) ||
      (normalized.firstLastGender && byFirstLastGender.get(normalized.firstLastGender)) ||
      (normalized.fullName && byName.get(normalized.fullName)) ||
      null;

    let status: ImportPreviewRow['status'] = 'ready';
    let duplicateReason: string | undefined;
    let matchingField: string | undefined;

    if (duplicateInside) {
      status = 'duplicate';
      duplicateReason = `Duplicate inside uploaded file, matches row ${duplicateInside}`;
      matchingField = 'Uploaded file';
    } else if (existingMatch) {
      status = 'duplicate';
      if (normalized.phone && byPhone.get(normalized.phone)) {
        duplicateReason = 'Phone number already exists';
        matchingField = 'Phone';
      } else if (normalized.email && byEmail.get(normalized.email)) {
        duplicateReason = 'Email already exists';
        matchingField = 'Email';
      } else if (normalized.fullNameDob && byNameDob.get(normalized.fullNameDob)) {
        duplicateReason = 'Name and Date of Birth already exists';
        matchingField = 'Full name + Date of Birth';
      } else if (normalized.firstLastGender && byFirstLastGender.get(normalized.firstLastGender)) {
        duplicateReason = 'First name, last name, and gender already exists';
        matchingField = 'First name + Last name + Gender';
      } else {
        duplicateReason = 'Name already exists';
        matchingField = 'Full name';
      }
    }

    Object.entries(normalized).forEach(([key, value]) => {
      if (value && key in seen) seen[key as keyof typeof seen].set(value, rowNumber);
    });

    previewRows.push({
      rowNumber,
      rawData: rawRow,
      data: normalizeImportRow(parsed.data),
      status,
      duplicateReason,
      matchingPersonId: existingMatch?.id,
      matchingPersonName: existingMatch ? existingPersonName(existingMatch) : undefined,
      matchingField,
      selectedAction: status === 'ready' ? 'create' : 'skip',
    });
  });

  const duplicateRows = previewRows.filter((row) => row.status === 'duplicate').length;
  const errorRows = previewRows.filter((row) => row.status === 'error').length;
  const readyRows = previewRows.filter((row) => row.status === 'ready').length;

  return {
    totalRows: rows.length,
    validRows: previewRows.length - errorRows,
    duplicateRows,
    errorRows,
    readyRows,
    rows: previewRows,
    warnings: rows.some((row) => typeof row === 'object' && row && !('dateOfBirth' in row))
      ? ['Date of Birth is missing. Birthday features will not work for these people.']
      : [],
  };
}
