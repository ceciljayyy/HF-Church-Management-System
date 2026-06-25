import { serverApi } from '@/lib/server-api';
import { AdminRolesPageClient } from '@/features/admin/roles-page';

export default async function AdminRolesPage() {
  const [roles, permissions] = await Promise.all([
    serverApi.listResource('roles'),
    serverApi.listResource('permissions'),
  ]);

  return <AdminRolesPageClient initialRoles={roles.items ?? []} permissions={permissions.items ?? []} />;
}
