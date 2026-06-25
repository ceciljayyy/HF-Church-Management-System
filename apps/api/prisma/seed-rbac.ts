import path from 'node:path';
import { defaultRolePermissions, permissionCatalog, removedRoles } from '@church/shared';

try {
  process.loadEnvFile(path.resolve(process.cwd(), '.env'));
} catch {
  // DATABASE_URL can also be provided by the shell.
}

const legacyRoleTargets: Record<string, string> = {
  'Church Admin': 'Church Administrator',
  'Attendance Officer': 'Viewer',
  'Attendance Officer / Ushers': 'Viewer',
  'Events Coordinator': 'Church Administrator',
  Auditor: 'Viewer',
  'Group Leader': 'Head of Department',
  Member: 'Viewer',
};

async function main() {
  const { prisma } = await import('../src/lib/prisma');

  for (const permission of permissionCatalog) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        description: permission.name,
        module: permission.module,
      },
      create: {
        key: permission.key,
        name: permission.name,
        description: permission.name,
        module: permission.module,
      },
    });
  }

  const permissionRows = await prisma.permission.findMany();
  const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission.id]));

  for (const [roleName, keys] of Object.entries(defaultRolePermissions)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { isSystem: true, description: `${roleName} role` },
      create: { name: roleName, description: `${roleName} role`, isSystem: true },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: keys
        .map((key) => permissionByKey.get(key))
        .filter((permissionId): permissionId is string => Boolean(permissionId))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }

  for (const legacyRoleName of removedRoles) {
    const legacyRole = await prisma.role.findUnique({ where: { name: legacyRoleName } });
    if (!legacyRole) continue;

    const targetRoleName = legacyRoleTargets[legacyRoleName] ?? 'Viewer';
    const targetRole = await prisma.role.findUnique({ where: { name: targetRoleName } });
    if (!targetRole) continue;

    const legacyAssignments = await prisma.userRole.findMany({
      where: { roleId: legacyRole.id },
      select: { userId: true, scopeType: true, scopeId: true },
    });

    await prisma.userRole.createMany({
      data: legacyAssignments.map((assignment) => ({
        userId: assignment.userId,
        roleId: targetRole.id,
        scopeType: assignment.scopeType,
        scopeId: assignment.scopeId,
      })),
      skipDuplicates: true,
    });

    await prisma.userRole.deleteMany({ where: { roleId: legacyRole.id } });
    await prisma.rolePermission.deleteMany({ where: { roleId: legacyRole.id } });
    await prisma.role.update({
      where: { id: legacyRole.id },
      data: { isSystem: false, description: 'Legacy role removed from the active access-control policy.' },
    });
  }

  const superAdmin = await prisma.user.findUnique({ where: { email: 'admin@church.test' } });
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
  if (superAdmin && superAdminRole) {
    await prisma.userRole.createMany({
      data: [{ userId: superAdmin.id, roleId: superAdminRole.id, scopeType: 'GLOBAL' }],
      skipDuplicates: true,
    });
  }

  await prisma.$disconnect();
  console.log('RBAC sync completed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
