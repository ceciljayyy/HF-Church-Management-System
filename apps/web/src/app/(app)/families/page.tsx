import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function FamiliesPage() {
  const { items = [] } = await serverApi.listResource('families');
  return <ModulePage title="Families" description="Organize households and family relationships." rows={items.map((item: any) => [item.familyName, item.primaryPhone ?? item.primaryEmail ?? '—', item.deletedAt ? 'Archived' : 'Active'])} />;
}