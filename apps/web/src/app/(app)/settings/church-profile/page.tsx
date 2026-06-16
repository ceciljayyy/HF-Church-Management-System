import { ChurchProfileWizard } from '@/features/church-profile/church-profile-wizard';
import { serverApi } from '@/lib/server-api';

export default async function ChurchProfileSettingsPage() {
  const { churchProfile } = await serverApi.getChurchProfile();
  return <ChurchProfileWizard initialProfile={churchProfile} mode="settings" />;
}
