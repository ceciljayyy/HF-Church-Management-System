import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function EventsPage() {
  const { items = [] } = await serverApi.listResource('events');
  return <ModulePage title="Events" description="Create and manage services, conferences, and ministry events." rows={items.map((item: any) => [item.title, new Date(item.startDateTime).toLocaleDateString(), item.status])} />;
}