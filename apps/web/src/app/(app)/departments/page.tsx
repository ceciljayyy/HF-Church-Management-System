import { serverApi } from '@/lib/server-api';
import { DepartmentsPageClient } from '@/features/departments/departments-page';

export default async function DepartmentsPage() {
  const data = await serverApi.listResource('departments', { page: 1, limit: 20 });
  return <DepartmentsPageClient initialData={data} />;
}
