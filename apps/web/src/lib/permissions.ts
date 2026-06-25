const permissionAliases: Record<string, string[]> = {
  'dashboard.read': ['dashboard.view'],
  'people.read': ['people.view'],
  'people.archive': ['people.delete'],
  'finance.read': ['finance.view'],
  'finance.create': ['expenses.create', 'funds.create', 'welfare.recordPayment'],
  'finance.update': ['expenses.update', 'funds.update', 'welfare.updatePayment'],
  'finance.approve': ['expenses.approve'],
  'events.manage': ['events.create', 'events.update', 'events.cancel', 'events.delete'],
  'attendance.manage': ['attendance.view', 'attendance.record', 'attendance.update'],
  'groups.manage': ['departments.view', 'departments.update', 'departments.addMember'],
  'settings.update': ['settings.view', 'settings.updateProfile', 'settings.updateChurchProfile'],
  'users.manage': ['users.view', 'users.create', 'users.update', 'users.deactivate'],
  'roles.manage': ['roles.view', 'roles.create', 'roles.update', 'roles.delete', 'roles.assign'],
  'audit.read': ['auditLogs.view'],
};

function equivalentPermissions(required: string) {
  const aliases = permissionAliases[required] ?? [];
  const reverseAliases = Object.entries(permissionAliases)
    .filter(([, values]) => values.includes(required))
    .map(([legacy]) => legacy);
  return [required, ...aliases, ...reverseAliases];
}

export function can(permissions: string[] = [], required?: string) {
  if (!required) return true;
  if (permissions.includes('admin.*')) return true;
  return equivalentPermissions(required).some((permission) => permissions.includes(permission));
}

export function canAny(permissions: string[] = [], required: string[] = []) {
  if (!required.length) return true;
  return required.some((permission) => can(permissions, permission));
}

export function canAll(permissions: string[] = [], required: string[] = []) {
  return required.every((permission) => can(permissions, permission));
}

