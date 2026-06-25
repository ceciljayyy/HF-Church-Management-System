import { prisma } from './prisma';
import { failure } from './http';
import { hasPermission as hasTokenPermission } from './rbac';

type AccessContext = {
  scopeType?: 'GLOBAL' | 'DEPARTMENT' | 'SELF' | 'NONE';
  scopeId?: string | null;
  departmentId?: string | null;
  personId?: string | null;
};

function contextScopeId(context?: AccessContext) {
  return context?.scopeId ?? context?.departmentId ?? context?.personId ?? null;
}

function scopeMatches(accessScopeType?: string | null, accessScopeId?: string | null, context?: AccessContext) {
  if (!accessScopeType || accessScopeType === 'GLOBAL') return true;
  if (accessScopeType === 'NONE') return false;
  const targetId = contextScopeId(context);
  if (accessScopeType === 'DEPARTMENT') return Boolean(targetId && accessScopeId === targetId);
  if (accessScopeType === 'SELF') return Boolean(targetId && accessScopeId === targetId);
  return false;
}

function isMissingPermissionOverrideStorage(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'P2021' || error.code === 'P2022')
  );
}

let permissionOverrideStorageExists: Promise<boolean> | null = null;
let userRoleScopeStorageExists: Promise<boolean> | null = null;

async function hasPermissionOverrideStorage() {
  permissionOverrideStorageExists ??= prisma
    .$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'UserPermissionOverride'
      ) AS "exists"
    `
    .then((rows) => rows[0]?.exists ?? false);

  return permissionOverrideStorageExists;
}

async function hasUserRoleScopeStorage() {
  userRoleScopeStorageExists ??= prisma
    .$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'UserRole'
          AND column_name IN ('scopeType', 'scopeId')
        GROUP BY table_name
        HAVING COUNT(*) = 2
      ) AS "exists"
    `
    .then((rows) => rows[0]?.exists ?? false)
    .catch(() => false);

  return userRoleScopeStorageExists;
}

async function findUserForAccess(userId: string) {
  const roleSelect = {
    roleId: true,
    role: {
      select: {
        id: true,
        name: true,
        permissions: { select: { permission: { select: { key: true } } } },
      },
    },
  };

  const baseSelect = {
    id: true,
    branchId: true,
    name: true,
    email: true,
    avatarUrl: true,
    mustChangePassword: true,
    status: true,
    branch: true,
  };

  const user = (await hasUserRoleScopeStorage())
    ? await prisma.user
        .findUnique({
          where: { id: userId },
          select: {
            ...baseSelect,
            roles: {
              select: {
                ...roleSelect,
                scopeType: true,
                scopeId: true,
              },
            },
          },
        })
        .catch((error) => {
          if (isMissingPermissionOverrideStorage(error)) return null;
          throw error;
        })
    : null;

  if (user) return user;

  const fallbackUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...baseSelect,
      roles: { select: roleSelect },
    },
  });

  if (!fallbackUser) return null;

  return {
    ...fallbackUser,
    roles: fallbackUser.roles.map((userRole) => ({
      ...userRole,
      scopeType: 'GLOBAL' as const,
      scopeId: null,
    })),
  };
}

export async function getUserAccess(userId: string) {
  const user = await findUserForAccess(userId);

  if (!user) return null;

  const userPermissionOverrides = (await hasPermissionOverrideStorage())
    ? await prisma.userPermissionOverride
        .findMany({
          where: { userId },
          select: {
            id: true,
            effect: true,
            scopeType: true,
            scopeId: true,
            reason: true,
            permission: { select: { key: true } },
          },
        })
        .catch((error) => {
          if (isMissingPermissionOverrideStorage(error)) return [];
          throw error;
        })
    : [];

  const rolePermissions = user.roles.flatMap((userRole) =>
    userRole.role.permissions.map((rolePermission) => ({
      key: rolePermission.permission.key,
      scopeType: userRole.scopeType,
      scopeId: userRole.scopeId,
      source: 'role' as const,
      roleName: userRole.role.name,
    })),
  );

  const overrides = userPermissionOverrides.map((override) => ({
    id: override.id,
    key: override.permission.key,
    effect: override.effect,
    scopeType: override.scopeType,
    scopeId: override.scopeId,
    reason: override.reason,
  }));

  const denied = overrides
    .filter((override) => override.effect === 'DENY' && scopeMatches(override.scopeType, override.scopeId))
    .map((override) => override.key);
  const allowedOverrides = overrides
    .filter((override) => override.effect === 'ALLOW' && scopeMatches(override.scopeType, override.scopeId))
    .map((override) => override.key);
  const roleKeys = rolePermissions
    .filter((permission) => scopeMatches(permission.scopeType, permission.scopeId))
    .map((permission) => permission.key);
  const permissions = [...new Set([...roleKeys, ...allowedOverrides].filter((key) => !denied.includes(key)))];

  return {
    user,
    person: null,
    roles: user.roles.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
      scopeType: userRole.scopeType,
      scopeId: userRole.scopeId,
    })),
    scopes: user.roles.map((userRole) => ({
      roleId: userRole.roleId,
      roleName: userRole.role.name,
      scopeType: userRole.scopeType,
      scopeId: userRole.scopeId,
    })),
    permissions,
    rolePermissions,
    permissionOverrides: overrides,
    isSuperAdmin: user.roles.some((userRole) => userRole.role.name === 'Super Admin'),
  };
}

export async function getUserPermissions(userId: string) {
  return (await getUserAccess(userId))?.permissions ?? [];
}

export async function hasPermission(userId: string, permissionKey: string, context?: AccessContext) {
  const access = await getUserAccess(userId);
  if (!access) return false;
  if (access.isSuperAdmin) return true;

  const matchingDeny = access.permissionOverrides.some(
    (override) =>
      override.effect === 'DENY' &&
      hasTokenPermission([override.key], permissionKey) &&
      scopeMatches(override.scopeType, override.scopeId, context),
  );
  if (matchingDeny) return false;

  const matchingAllow = access.permissionOverrides.some(
    (override) =>
      override.effect === 'ALLOW' &&
      hasTokenPermission([override.key], permissionKey) &&
      scopeMatches(override.scopeType, override.scopeId, context),
  );
  if (matchingAllow) return true;

  return access.rolePermissions.some(
    (permission) =>
      hasTokenPermission([permission.key], permissionKey) &&
      scopeMatches(permission.scopeType, permission.scopeId, context),
  );
}

export async function requirePermission(userId: string, permissionKey: string, context?: AccessContext) {
  if (await hasPermission(userId, permissionKey, context)) return null;
  return failure('You do not have permission to perform this action.', 403);
}

export async function canAccessDepartment(userId: string, departmentId: string) {
  return (
    (await hasPermission(userId, 'departments.view', { scopeType: 'DEPARTMENT', departmentId })) ||
    (await hasPermission(userId, 'departments.manageOwnDepartment', { scopeType: 'DEPARTMENT', departmentId }))
  );
}

export async function canCreateDepartmentExpense(userId: string, departmentId: string) {
  return (
    (await hasPermission(userId, 'expenses.create', { scopeType: 'GLOBAL' })) ||
    (await hasPermission(userId, 'expenses.createForDepartment', { scopeType: 'DEPARTMENT', departmentId }))
  );
}

export async function canApproveExpense(userId: string, expense: { requestedById?: string | null; departmentId?: string | null }) {
  if (expense.requestedById === userId && !(await hasPermission(userId, 'expenses.approveOwnExpense'))) {
    return false;
  }
  return hasPermission(userId, 'expenses.approve', {
    scopeType: expense.departmentId ? 'DEPARTMENT' : 'GLOBAL',
    departmentId: expense.departmentId,
  });
}

export async function canManageUserAccess(actorUserId: string, targetUserId: string) {
  if (actorUserId === targetUserId) return false;
  return (
    (await hasPermission(actorUserId, 'users.update')) ||
    (await hasPermission(actorUserId, 'roles.assign')) ||
    (await hasPermission(actorUserId, 'permissions.override'))
  );
}
