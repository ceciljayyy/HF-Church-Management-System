import { createHash } from 'node:crypto';

type KeyPart = string | number | boolean | null | undefined;

function normalizePart(value: KeyPart) {
  if (value === null || value === undefined || value === '') return 'none';
  return String(value).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
}

function branchPrefix(branchId?: string | null) {
  return branchId ? `cms:branch:${normalizePart(branchId)}` : 'cms:global';
}

export function paramsHash(params: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 16);
}

export const cacheKeys = {
  dashboardVersion: (branchId?: string | null) => `${branchPrefix(branchId)}:dashboard:version`,
  dashboardCards: (branchId: string | null | undefined, version: number) =>
    `${branchPrefix(branchId)}:dashboard:v${version}:cards`,
  dashboardSummary: (branchId: string | null | undefined, version: number) =>
    `${branchPrefix(branchId)}:dashboard:v${version}:summary`,

  peopleVersion: (branchId: string) => `${branchPrefix(branchId)}:people:version`,
  peopleList: (branchId: string, version: number, params: Record<string, unknown>) =>
    `${branchPrefix(branchId)}:people:v${version}:list:${paramsHash(params)}`,
  peopleCount: (branchId: string, version: number, params: Record<string, unknown>) =>
    `${branchPrefix(branchId)}:people:v${version}:count:${paramsHash(params)}`,

  departmentsVersion: (branchId: string) => `${branchPrefix(branchId)}:departments:version`,
  departmentsList: (branchId: string, version: number, params: Record<string, unknown>) =>
    `${branchPrefix(branchId)}:departments:v${version}:list:${paramsHash(params)}`,
  departmentDetail: (branchId: string, version: number, id: string) =>
    `${branchPrefix(branchId)}:departments:v${version}:detail:${normalizePart(id)}`,

  attendanceVersion: (branchId: string) => `${branchPrefix(branchId)}:attendance:version`,
  attendanceOverview: (branchId: string, version: number) =>
    `${branchPrefix(branchId)}:attendance:v${version}:overview`,

  reportsVersion: (branchId?: string | null) => `${branchPrefix(branchId)}:reports:version`,
  reports: (branchId: string | null | undefined, version: number, reportType: string, params: Record<string, unknown>) =>
    `${branchPrefix(branchId)}:reports:v${version}:${normalizePart(reportType)}:${paramsHash(params)}`,
};
