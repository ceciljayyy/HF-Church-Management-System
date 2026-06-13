import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function MembersPage() {
  const { items = [] } = await serverApi.listResource('members');
  return <ModulePage title="Members" description="Track membership status, baptism, and household details." rows={items.map((item: any) => [item.membershipNumber, item.status, item.membershipType])} />;
}