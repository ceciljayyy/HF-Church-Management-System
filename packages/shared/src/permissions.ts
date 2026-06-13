export const permissions = [
  'dashboard.read',
  'people.read',
  'people.create',
  'people.import',
  'people.update',
  'people.archive',
  'members.read',
  'members.create',
  'members.update',
  'members.archive',
  'families.manage',
  'groups.manage',
  'events.manage',
  'attendance.manage',
  'finance.read',
  'finance.create',
  'finance.update',
  'finance.approve',
  'reports.read',
  'settings.update',
  'users.manage',
  'roles.manage',
  'audit.read',
] as const;

export type PermissionKey = (typeof permissions)[number];

export const defaultRoles = [
  'Super Admin',
  'Church Admin',
  'Pastor',
  'Finance Officer',
  'Attendance Officer',
  'Group Leader',
  'Member',
] as const;

export type DefaultRoleName = (typeof defaultRoles)[number];
