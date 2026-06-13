import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function ContributionsPage() {
  const { items = [] } = await serverApi.listResource('finance/contributions');
  return <ModulePage title="Contributions" description="Tithes, offerings, donations, and seed records." rows={items.map((item: any) => [item.reference ?? item.id, Number(item.amount).toFixed(2), item.type])} />;
}