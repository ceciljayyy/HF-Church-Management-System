'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { can, canAll, canAny } from '@/lib/permissions';

type PermissionContextValue = {
  permissions: string[];
};

const PermissionContext = createContext<PermissionContextValue>({ permissions: [] });

export function PermissionProvider({ permissions, children }: { permissions: string[]; children: ReactNode }) {
  return <PermissionContext.Provider value={{ permissions }}>{children}</PermissionContext.Provider>;
}

export function useCurrentUserPermissions() {
  return useContext(PermissionContext).permissions;
}

export function useCan(permissionKey: string) {
  return can(useCurrentUserPermissions(), permissionKey);
}

export function useCanAny(permissionKeys: string[]) {
  return canAny(useCurrentUserPermissions(), permissionKeys);
}

export function useCanAll(permissionKeys: string[]) {
  return canAll(useCurrentUserPermissions(), permissionKeys);
}

export function Can({ permission, any, all, children }: { permission?: string; any?: string[]; all?: string[]; children: ReactNode }) {
  const permissions = useCurrentUserPermissions();
  const allowed = permission ? can(permissions, permission) : any ? canAny(permissions, any) : all ? canAll(permissions, all) : true;
  return allowed ? <>{children}</> : null;
}
