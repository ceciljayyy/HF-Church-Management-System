import { serverApi } from '@/lib/server-api';
import { DepartmentRolesPageClient } from '@/features/departments/department-roles-page';

export default async function AdminRolesPage() {
  const data = await serverApi.listResource('departments/roles', { page: 1, limit: 20 });
  return <DepartmentRolesPageClient initialData={data} />;
}
