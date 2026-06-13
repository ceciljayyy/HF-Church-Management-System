import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function AdminUsersPage() {
  const { items = [] } = await serverApi.listResource('users');
  return <ModulePage title="Users" description="Manage system users and branch assignments." rows={items.map((item: any) => [item.name, item.email, item.status])} />;
}