import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function AuditLogsPage() {
  const { items = [] } = await serverApi.listResource('audit-logs');
  return <ModulePage title="Audit Logs" description="Track protected actions, data changes, and security events." rows={items.map((item: any) => [item.action, item.entity, new Date(item.createdAt).toLocaleString()])} />;
}