import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';

try {
  process.loadEnvFile(path.resolve(process.cwd(), '.env'));
} catch {
  // The script also works when DATABASE_URL is already provided by the shell.
}

type CsvPerson = {
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  dateOfBirth: Date;
  phone: string;
  email: string;
  address: string | null;
  classification: string;
  membershipDate: Date | null;
  notes: string | null;
};

const defaultCsvPath = 'C:\\Users\\nk-cil\\Downloads\\people-import-ghana-200-members-clean.csv';
const validateOnly = process.argv.includes('--validate-only');
const csvPath = process.argv.find((arg) => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1]) || process.env.PEOPLE_CSV_PATH || defaultCsvPath;
const ghanaPhonePattern = /^\+233\d{9}$/;
let prisma: Awaited<typeof import('../src/lib/prisma')>['prisma'] | undefined;

function normalizeClassification(value?: string | null) {
  const normalized = (value ?? '').trim().toLowerCase();
  const map: Record<string, string> = {
    member: 'Member',
    visitor: 'Visitor',
    'first timer': 'First Timer',
    first_timer: 'First Timer',
    firsttimer: 'First Timer',
    'new convert': 'New Convert',
    new_convert: 'New Convert',
  };
  return map[normalized] ?? (value?.trim() || 'Unassigned');
}

function normalizeGender(value?: string | null) {
  const normalized = (value ?? '').trim().toLowerCase();
  if (['male', 'm'].includes(normalized)) return 'MALE';
  if (['female', 'f'].includes(normalized)) return 'FEMALE';
  if (['prefer not to say', 'prefer_not_to_say'].includes(normalized)) return 'PREFER_NOT_TO_SAY';
  return normalized ? 'OTHER' : null;
}

function qualifiesForMembership(classification?: string | null) {
  return normalizeClassification(classification) === 'Member';
}

function cuidLike(index: number) {
  return `c${Date.now().toString(36)}${index.toString(36).padStart(4, '0')}${randomBytes(8).toString('hex')}`;
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    if (row.some((value) => value.trim())) rows.push(row);
  }

  return rows;
}

function parseDate(value: string, rowNumber: number, field: string) {
  const raw = value.trim();
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const date = us
    ? new Date(Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2])))
    : iso
      ? new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])))
      : new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Row ${rowNumber}: ${field} is invalid.`);
  }

  return date;
}

function normalizeCsvPhone(value: string, rowNumber: number) {
  const raw = value.trim();
  const numeric = /^[\d.]+e\+?\d+$/i.test(raw) ? Number(raw).toFixed(0) : raw.replace(/[^\d+]/g, '');
  const digits = numeric.startsWith('+') ? numeric.slice(1) : numeric;
  const phone = digits.startsWith('233') ? `+${digits}` : digits.startsWith('0') ? `+233${digits.slice(1)}` : `+233${digits}`;

  if (!ghanaPhonePattern.test(phone)) {
    throw new Error(`Row ${rowNumber}: phone must normalize to +233 followed by 9 digits.`);
  }

  return phone;
}

function normalizeEmail(value: string, rowNumber: number) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
    throw new Error(`Row ${rowNumber}: email must be a valid Gmail address.`);
  }
  return email;
}

function validateRows(rows: string[][]) {
  const [headers, ...dataRows] = rows;
  const expectedHeaders = ['First Name', 'Last Name', 'Gender', 'Date of Birth', 'Phone', 'Email', 'Address', 'Classification', 'Membership Date', 'Notes'];
  if (!headers || expectedHeaders.some((header, index) => headers[index]?.trim() !== header)) {
    throw new Error(`CSV headers must be: ${expectedHeaders.join(', ')}`);
  }
  if (dataRows.length !== 200) {
    throw new Error(`Expected exactly 200 people rows, found ${dataRows.length}.`);
  }

  const seenEmails = new Set<string>();

  return dataRows.map((row, index): CsvPerson => {
    const rowNumber = index + 2;
    const firstName = row[0]?.trim();
    const lastName = row[1]?.trim();
    if (!firstName) throw new Error(`Row ${rowNumber}: first name is required.`);
    if (!lastName) throw new Error(`Row ${rowNumber}: last name is required.`);

    const phone = normalizeCsvPhone(row[4] ?? '', rowNumber);
    const email = normalizeEmail(row[5] ?? '', rowNumber);
    if (seenEmails.has(email)) throw new Error(`Row ${rowNumber}: duplicate email ${email}.`);
    seenEmails.add(email);

    return {
      firstName,
      lastName,
      gender: normalizeGender(row[2]) as CsvPerson['gender'],
      dateOfBirth: parseDate(row[3] ?? '', rowNumber, 'Date of Birth'),
      phone,
      email,
      address: row[6]?.trim() || null,
      classification: normalizeClassification(row[7]),
      membershipDate: row[8]?.trim() ? parseDate(row[8], rowNumber, 'Membership Date') : null,
      notes: row[9]?.trim() || null,
    };
  });
}

async function main() {
  const content = fs.readFileSync(csvPath, 'utf8');
  const people = validateRows(parseCsv(content));
  if (validateOnly) {
    console.log(JSON.stringify({ validRows: people.length, csvPath }, null, 2));
    return;
  }

  ({ prisma } = await import('../src/lib/prisma'));
  if (!prisma) throw new Error('Prisma client failed to initialize.');
  const db = prisma;
  const branch = await db.branch.findFirst({ orderBy: [{ isMainBranch: 'desc' }, { createdAt: 'asc' }] });
  if (!branch) throw new Error('No branch is configured. Run the base seed or onboarding first.');

  const result = await db.$transaction(
    async (tx) => {
      const oldPeople = await tx.person.findMany({
        where: { branchId: branch.id, deletedAt: null },
        select: { id: true },
      });
      const oldPersonIds = oldPeople.map((person) => person.id);

      await tx.contribution.updateMany({
        where: { branchId: branch.id, personId: { in: oldPersonIds } },
        data: { personId: null },
      });
      await tx.pledge.updateMany({
        where: { branchId: branch.id, contributorId: { in: oldPersonIds } },
        data: { contributorId: null },
      });
      await tx.group.updateMany({
        where: { branchId: branch.id, leaderId: { in: oldPersonIds } },
        data: { leaderId: null },
      });

      // These rows are direct person-owned links. Clearing them prevents foreign key cascades from touching module tables.
      const deletedAttendance = await tx.attendanceRecord.deleteMany({ where: { personId: { in: oldPersonIds } } });
      const deletedGroupMembers = await tx.groupMember.deleteMany({ where: { personId: { in: oldPersonIds } } });
      const deletedFamilyMembers = await tx.familyMember.deleteMany({ where: { personId: { in: oldPersonIds } } });
      const deletedMembers = await tx.member.deleteMany({ where: { personId: { in: oldPersonIds } } });
      const deletedPeople = await tx.person.deleteMany({ where: { id: { in: oldPersonIds } } });

      const personRows = people.map((person, index) => ({
        id: cuidLike(index),
        branchId: branch.id,
        firstName: person.firstName,
        lastName: person.lastName,
        gender: person.gender,
        dateOfBirth: person.dateOfBirth,
        phone: person.phone,
        mobilePhone: person.phone,
        email: person.email,
        address: person.address,
        classification: person.classification,
        notes: person.notes,
      }));
      await tx.person.createMany({ data: personRows });

      const memberRows = people
        .map((person, index) => ({ person, personId: personRows[index]!.id, index }))
        .filter(({ person }) => qualifiesForMembership(person.classification))
        .map(({ person, personId, index }) => ({
          branchId: branch.id,
          personId,
          membershipNumber: `CSV-${String(index + 1).padStart(5, '0')}`,
          status: 'ACTIVE' as const,
          joinedAt: person.membershipDate,
          membershipType: 'OTHER' as const,
        }));
      await tx.member.createMany({ data: memberRows });

      const imported = personRows.length;

      await tx.auditLog.create({
        data: {
          branchId: branch.id,
          userId: null,
          action: 'people.csv_import.replace',
          entity: 'Person',
          oldValue: Prisma.JsonNull,
          newValue: {
            source: csvPath,
            deletedPeople: deletedPeople.count,
            imported,
            skipped: 0,
            deletedDirectLinks: {
              attendanceRecords: deletedAttendance.count,
              groupMembers: deletedGroupMembers.count,
              familyMembers: deletedFamilyMembers.count,
              members: deletedMembers.count,
            },
          },
          ipAddress: '127.0.0.1',
          userAgent: 'seed-people-from-csv',
        },
      });

      await tx.activityLog.create({
        data: {
          branchId: branch.id,
          userId: null,
          title: 'People CSV import completed',
          description: `${deletedPeople.count} old people deleted and ${imported} people imported from CSV.`,
          type: 'people.import',
        },
      });

      return {
        deleted: deletedPeople.count,
        imported,
        skipped: 0,
        deletedDirectLinks: {
          attendanceRecords: deletedAttendance.count,
          groupMembers: deletedGroupMembers.count,
          familyMembers: deletedFamilyMembers.count,
          members: deletedMembers.count,
        },
      };
    },
    { maxWait: 30_000, timeout: 120_000 },
  );

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
