import { serverApi } from '@/lib/server-api';
import { DepartmentDetailPageClient } from '@/features/departments/department-detail-page';

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ item }, peopleData, departmentsData] = await Promise.all([
    serverApi.listResource('departments', { id }),
    serverApi.listResource('people', { page: 1, limit: 100 }),
    serverApi.listResource('departments', { page: 1, limit: 100 }),
  ]);

  return <DepartmentDetailPageClient initialDepartment={item} people={peopleData.items ?? []} departments={departmentsData.items ?? []} />;
}
