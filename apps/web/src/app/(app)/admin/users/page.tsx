import { serverApi } from '@/lib/server-api';
import { AdminUsersPageClient } from '@/features/admin/users-page';

export default async function AdminUsersPage() {
  const [users, roles, people, departments] = await Promise.all([
    serverApi.listResource('users'),
    serverApi.listResource('roles'),
    serverApi.listResource('people/lookup', { limit: 100 }),
    serverApi.listResource('departments', { page: 1, limit: 100, status: 'ACTIVE' }),
  ]);

  return (
    <AdminUsersPageClient
      initialUsers={users.items ?? []}
      roles={roles.items ?? []}
      people={people.items ?? []}
      departments={departments.items ?? []}
    />
  );
}
