export function hasPermission(permissions: string[], required: string) {
  return permissions.includes(required) || permissions.includes('admin.*');
}

export function hasAnyPermission(permissions: string[], required: string[]) {
  return required.some((permission) => hasPermission(permissions, permission));
}