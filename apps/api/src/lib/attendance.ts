import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type AttendanceField = {
  id: string;
  label: string;
  key: string;
  type: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  helpText?: string;
  countTowardTotal: boolean;
};

export type AttendanceSection = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  icon?: string;
  fields: AttendanceField[];
  status: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceRecord = {
  id: string;
  sectionId: string;
  sectionName: string;
  sectionSlug: string;
  serviceTitle: string;
  attendanceDate: string;
  values: Record<string, unknown>;
  total: number;
  notes?: string;
  recordedById?: string | null;
  recordedByName?: string;
  createdAt: string;
  updatedAt: string;
};

export const defaultAttendanceSections: AttendanceSection[] = [
  {
    id: 'main-service',
    name: 'Main Service',
    slug: 'main-service',
    description: 'Adult/main church service attendance.',
    type: 'SERVICE',
    icon: 'Users',
    fields: [
      { id: 'men', label: 'Men', key: 'men', type: 'number', required: true, countTowardTotal: true },
      { id: 'women', label: 'Women', key: 'women', type: 'number', required: true, countTowardTotal: true },
    ],
    status: 'ACTIVE',
    isDefault: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'children-service',
    name: 'Children Service',
    slug: 'children-service',
    description: 'Children service attendance.',
    type: 'CHILDREN',
    icon: 'Heart',
    fields: [
      { id: 'boys', label: 'Boys', key: 'boys', type: 'number', required: true, countTowardTotal: true },
      { id: 'girls', label: 'Girls', key: 'girls', type: 'number', required: true, countTowardTotal: true },
    ],
    status: 'ACTIVE',
    isDefault: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    slug: 'vehicles',
    description: 'Vehicles parked during church service or events.',
    type: 'VEHICLE',
    icon: 'Car',
    fields: [
      { id: 'cars', label: 'Cars', key: 'cars', type: 'number', required: true, countTowardTotal: true },
      { id: 'bicycles', label: 'Bicycles', key: 'bicycles', type: 'number', required: true, countTowardTotal: true },
      { id: 'motors', label: 'Motors/Motorbikes', key: 'motors', type: 'number', required: true, countTowardTotal: true },
    ],
    status: 'ACTIVE',
    isDefault: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

function key(branchId: string, name: string) {
  return { branchId_key: { branchId, key: name } };
}

function asArray<T>(value: Prisma.JsonValue | null | undefined, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function getAttendanceSections(branchId: string) {
  const setting = await prisma.setting.findUnique({ where: key(branchId, 'attendance.sections') });
  const custom = asArray<AttendanceSection>(setting?.value, []);
  const byId = new Map([...defaultAttendanceSections, ...custom].map((section) => [section.id, section]));
  return Array.from(byId.values()).filter((section) => section.status !== 'ARCHIVED');
}

export async function saveCustomAttendanceSections(branchId: string, sections: AttendanceSection[]) {
  await prisma.setting.upsert({
    where: key(branchId, 'attendance.sections'),
    update: { value: sections as unknown as Prisma.InputJsonValue },
    create: { branchId, key: 'attendance.sections', value: sections as unknown as Prisma.InputJsonValue, type: 'JSON' },
  });
}

export async function getAttendanceRecords(branchId: string) {
  const setting = await prisma.setting.findUnique({ where: key(branchId, 'attendance.records') });
  return asArray<AttendanceRecord>(setting?.value, []).sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime());
}

export async function saveAttendanceRecords(branchId: string, records: AttendanceRecord[]) {
  await prisma.setting.upsert({
    where: key(branchId, 'attendance.records'),
    update: { value: records as unknown as Prisma.InputJsonValue },
    create: { branchId, key: 'attendance.records', value: records as unknown as Prisma.InputJsonValue, type: 'JSON' },
  });
}

export function calculateAttendanceTotal(section: AttendanceSection, values: Record<string, unknown>) {
  return section.fields
    .filter((field) => field.countTowardTotal)
    .reduce((total, field) => total + Number(values[field.key] ?? 0), 0);
}

export function summarizeAttendance(section: AttendanceSection, records: AttendanceRecord[]) {
  const sectionRecords = records.filter((record) => record.sectionId === section.id || record.sectionSlug === section.slug);
  const latest = sectionRecords[0] ?? null;
  const totals = sectionRecords.map((record) => Number(record.total ?? 0));
  const average = totals.length ? Math.round(totals.reduce((sum, total) => sum + total, 0) / totals.length) : 0;
  return {
    section,
    latest,
    records: sectionRecords,
    latestTotal: latest?.total ?? 0,
    lastRecordedAt: latest?.attendanceDate ?? null,
    average,
    highest: totals.length ? Math.max(...totals) : 0,
    lowest: totals.length ? Math.min(...totals) : 0,
    trend: sectionRecords.slice(0, 8).reverse().map((record) => ({
      name: new Date(record.attendanceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: record.total,
    })),
  };
}

export async function buildAttendanceOverview(branchId: string) {
  const [allSections, records, churchProfile] = await Promise.all([
    getAttendanceSections(branchId),
    getAttendanceRecords(branchId),
    (prisma as any).churchProfile.findUnique({ where: { branchId } }),
  ]);
  const sections = allSections.filter((section) => {
    if (section.id === 'children-service' && churchProfile?.enableChildrenServiceAttendance === false) return false;
    if (section.id === 'vehicles' && churchProfile?.enableVehicleCount === false) return false;
    return true;
  });
  const main = summarizeAttendance(allSections.find((section) => section.id === 'main-service')!, records);
  const childrenSection = allSections.find((section) => section.id === 'children-service')!;
  const vehiclesSection = allSections.find((section) => section.id === 'vehicles')!;
  const children =
    churchProfile?.enableChildrenServiceAttendance === false
      ? { ...summarizeAttendance(childrenSection, []), records: [], latest: null, latestTotal: 0, average: 0, highest: 0, lowest: 0, trend: [] }
      : summarizeAttendance(childrenSection, records);
  const vehicles =
    churchProfile?.enableVehicleCount === false
      ? { ...summarizeAttendance(vehiclesSection, []), records: [], latest: null, latestTotal: 0, average: 0, highest: 0, lowest: 0, trend: [] }
      : summarizeAttendance(vehiclesSection, records);
  const customSections = sections.filter((section) => !section.isDefault);
  const peopleRecords = records.filter((record) => record.sectionSlug !== 'vehicles');
  const thisMonth = new Date();
  const monthlyRecords = records.filter((record) => {
    const date = new Date(record.attendanceDate);
    return date.getFullYear() === thisMonth.getFullYear() && date.getMonth() === thisMonth.getMonth();
  });

  return {
    cards: { main, children, vehicles },
    sections,
    customSections,
    records,
    recentRecords: records.slice(0, 8),
    highestAttendanceThisMonth: monthlyRecords.length ? Math.max(...monthlyRecords.map((record) => record.total)) : 0,
    averageAttendanceThisMonth: monthlyRecords.length ? Math.round(monthlyRecords.reduce((sum, record) => sum + record.total, 0) / monthlyRecords.length) : 0,
    peopleAttendanceToday: (main.latest?.total ?? 0) + (children.latest?.total ?? 0),
    vehiclesToday: vehicles.latest?.total ?? 0,
    trend: peopleRecords.slice(0, 12).reverse().map((record) => ({
      name: new Date(record.attendanceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: record.total,
    })),
  };
}
