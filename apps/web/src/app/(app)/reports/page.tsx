import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function ReportsPage() {
  const { items = [] } = await serverApi.listResource('reports');
  return <ModulePage title="Reports" description="Saved snapshots for finance, growth, membership, and attendance." rows={items.map((item: any) => [item.title, item.reportType, new Date(item.createdAt).toLocaleDateString()])} />;
}