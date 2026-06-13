import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function SettingsPage() {
  const { items = [] } = await serverApi.listResource('settings');
  return <ModulePage title="Settings" description="Configure branches, preferences, and system options." rows={items.map((item: any) => [item.key, item.type, new Date(item.updatedAt).toLocaleDateString()])} />;
}