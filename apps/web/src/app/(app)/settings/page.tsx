import { serverApi } from '@/lib/server-api';
import { SettingsPageClient } from '@/features/settings/settings-page';

export default async function SettingsPage() {
  const user = await serverApi.getCurrentUser();
  return <SettingsPageClient user={user} />;
}
